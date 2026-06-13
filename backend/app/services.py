import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import pandas as pd

from .config import MODEL_BUNDLE_FILE, RECIPE_FILE, TRAINING_DATA_FILE, SETTINGS_FILE


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_recipe_mapping(recipe_file: Path = RECIPE_FILE) -> Dict[str, Dict[str, float]]:
    with recipe_file.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_settings() -> Dict[str, Any]:
    """Return saved AI settings, or sensible defaults if the file is missing."""
    from .schemas import AISettings
    if SETTINGS_FILE.exists():
        try:
            with SETTINGS_FILE.open("r", encoding="utf-8") as fh:
                raw = json.load(fh)
            # Parse through the model so missing keys get defaults
            return AISettings(**raw).model_dump()
        except Exception:
            pass
    return AISettings().model_dump()


def build_feature_frame(scenario: Dict[str, Any]) -> pd.DataFrame:
    scenario_date = scenario["date"]
    if isinstance(scenario_date, str):
        scenario_date = date.fromisoformat(scenario_date)

    event_val = scenario.get("event", "No Event")
    if isinstance(event_val, str):
        local_event = int(event_val != "No Event")
    else:
        local_event = int(bool(event_val))

    return pd.DataFrame(
        [
            {
                "day_of_week": scenario_date.strftime("%A"),
                "is_weekend": int(scenario_date.weekday() >= 4),
                "temperature": float(scenario["temperature"]),
                "weather_condition": scenario["weather_condition"],
                "local_event": local_event,
            }
        ]
    )


def strip_suffix(value: str, suffix: str) -> str:
    if value.endswith(suffix):
        return value[: -len(suffix)]
    return value


# ---------------------------------------------------------------------------
# AI Prompt helpers
# ---------------------------------------------------------------------------

# This section of the prompt is STRICTLY fixed and not exposed to users.
# It enforces parseable JSON output that maps directly to the recipe keys.
_FIXED_OUTPUT_SCHEMA_INSTRUCTION = (
    "\n\n---\n"
    "CRITICAL OUTPUT RULES (non-negotiable):\n"
    "1. Respond ONLY with a single, raw JSON object on one line.\n"
    "2. Keys MUST exactly match the menu item names listed in the request.\n"
    "3. Values MUST be non-negative integers representing the predicted order count.\n"
    "4. Do NOT include any explanation, markdown, code fences, or extra keys.\n"
    "Example for items [Tacos, Burritos]: {\"Tacos\": 87, \"Burritos\": 54}"
)


def _build_ai_prompt(scenario: Dict[str, Any], items: List[str]) -> str:
    """Build the user-facing part of the prompt sent to the AI."""
    scenario_date = scenario["date"]
    if hasattr(scenario_date, "isoformat"):
        date_str = scenario_date.isoformat()
    else:
        date_str = str(scenario_date)

    parsed = date.fromisoformat(date_str) if isinstance(date_str, str) else scenario_date
    day_name = parsed.strftime("%A")
    is_weekend = parsed.weekday() >= 4

    event_val = scenario.get("event", "No Event")

    # Grab last 14 rows of historical data as context
    history_snippet = ""
    try:
        if TRAINING_DATA_FILE.exists():
            df = pd.read_csv(TRAINING_DATA_FILE)
            history_snippet = df.tail(14).to_csv(index=False)
    except Exception:
        pass

    prompt = (
        f"Date: {date_str} ({day_name})\n"
        f"Weekend: {'Yes' if is_weekend else 'No'}\n"
        f"Temperature: {scenario.get('temperature', 20)}°C\n"
        f"Weather: {scenario.get('weather_condition', 'Sunny')}\n"
        f"Local Event: {event_val}\n"
        f"Menu Items to predict: {', '.join(items)}\n"
    )
    if history_snippet:
        prompt += f"\nRecent historical sales (last 14 days):\n{history_snippet}"
    return prompt


def _call_gemini(api_key: str, model_name: str, system_prompt: str, user_prompt: str) -> str:
    """Call the Gemini generateContent REST endpoint and return the text response."""
    full_system = system_prompt + _FIXED_OUTPUT_SCHEMA_INSTRUCTION
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model_name}:generateContent?key={api_key}"
    )
    payload = {
        "system_instruction": {"parts": [{"text": full_system}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    # Navigate Gemini response structure
    return result["candidates"][0]["content"]["parts"][0]["text"]


# ---------------------------------------------------------------------------
# Forecast Service
# ---------------------------------------------------------------------------

class ForecastService:
    def __init__(self, model_bundle_file: Path = MODEL_BUNDLE_FILE) -> None:
        self.model_bundle_file = model_bundle_file
        self.recipe_mapping = load_recipe_mapping()
        self._bundle = self._load_bundle()

    def _load_bundle(self) -> Optional[Dict[str, Any]]:
        if not self.model_bundle_file.exists():
            return None
        return joblib.load(self.model_bundle_file)

    def get_metrics(self) -> Optional[Dict[str, Any]]:
        if self._bundle and "metrics" in self._bundle:
            return self._bundle["metrics"]
        return None

    def reload(self) -> None:
        """Hot-swap the model bundle and recipes in memory after retraining without a server restart."""
        self.recipe_mapping = load_recipe_mapping()
        self._bundle = self._load_bundle()

    # ------------------------------------------------------------------
    # Public prediction entry point
    # ------------------------------------------------------------------

    def predict(self, scenario: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        settings = load_settings()

        # Try AI prediction first if enabled
        if settings.get("use_ai") and settings.get("api_key"):
            try:
                return self._ai_prediction(scenario, settings)
            except Exception as exc:
                # Log failure and fall through to ML / baseline
                print(f"[AI Prediction] Failed, falling back to ML model: {exc}")

        # Fall through: local trained ML model
        feature_frame = build_feature_frame(scenario)
        if self._bundle and "models" in self._bundle:
            predictions = {}
            for item_name, model in self._bundle["models"].items():
                value = model.predict(feature_frame)[0]
                predictions[item_name] = max(0, int(round(value)))
            return "trained-model", predictions

        return "offline-baseline", self._fallback_prediction(scenario)

    # ------------------------------------------------------------------
    # AI prediction
    # ------------------------------------------------------------------

    def _ai_prediction(
        self, scenario: Dict[str, Any], settings: Dict[str, Any]
    ) -> Tuple[str, Dict[str, int]]:
        items = list(self.recipe_mapping.keys())
        if not items:
            raise ValueError("No menu items found in recipe mapping.")

        user_prompt = _build_ai_prompt(scenario, items)
        raw_text = _call_gemini(
            api_key=settings["api_key"],
            model_name=settings.get("model_name", "gemini-1.5-flash"),
            system_prompt=settings.get("system_prompt", ""),
            user_prompt=user_prompt,
        )

        # Parse and validate the JSON response
        parsed = json.loads(raw_text.strip())
        predictions: Dict[str, int] = {}
        for item in items:
            val = parsed.get(item, 0)
            predictions[item] = max(0, int(round(float(val))))

        return "ai-gemini", predictions

    # ------------------------------------------------------------------
    # Offline baseline fallback
    # ------------------------------------------------------------------

    def _fallback_prediction(self, scenario: Dict[str, Any]) -> Dict[str, int]:
        scenario_date = scenario["date"]
        if isinstance(scenario_date, str):
            scenario_date = date.fromisoformat(scenario_date)

        is_weekend = scenario_date.weekday() >= 4
        weather = scenario["weather_condition"]
        temp = float(scenario["temperature"])

        event_val = scenario.get("event", "No Event")
        if isinstance(event_val, str):
            event = event_val != "No Event"
        else:
            event = bool(event_val)

        burger = 52 + (16 if is_weekend else 0) + (28 if event else 0) + (8 if weather in {"Rainy", "Stormy"} else 0)
        pizza = 41 + (24 if is_weekend else 0) + (34 if event else 0) + (20 if weather == "Stormy" else 6 if weather == "Rainy" else 0)
        salad = 29 + (18 if temp > 25 else -8 if temp < 15 else 0) - (14 if weather in {"Rainy", "Stormy"} else 0)

        fallback = {}
        for item in self.recipe_mapping.keys():
            if item == "Burgers":
                fallback[item] = max(0, int(round(burger)))
            elif item == "Pizzas":
                fallback[item] = max(0, int(round(pizza)))
            elif item == "Salads":
                fallback[item] = max(0, int(round(salad)))
            else:
                fallback[item] = 0

        if not fallback:
            return {
                "Burgers": max(0, int(round(burger))),
                "Pizzas": max(0, int(round(pizza))),
                "Salads": max(0, int(round(salad))),
            }

        return fallback

    # ------------------------------------------------------------------
    # Ingredient prep sheet
    # ------------------------------------------------------------------

    def build_ingredient_prep(self, predictions: Dict[str, int]) -> List[Dict[str, Any]]:
        totals: Dict[str, Dict[str, float]] = {}
        for menu_item, quantity in predictions.items():
            recipe = self.recipe_mapping.get(menu_item, {})
            for ingredient, per_item_quantity in recipe.items():
                if ingredient.endswith("_kg"):
                    key = strip_suffix(ingredient, "_kg")
                    unit = "kg"
                elif ingredient.endswith("_g"):
                    key = strip_suffix(ingredient, "_g")
                    unit = "g"
                elif ingredient.endswith("_ml"):
                    key = strip_suffix(ingredient, "_ml")
                    unit = "ml"
                else:
                    key = ingredient
                    unit = "units"
                totals.setdefault(key, {"quantity": 0.0, "unit": unit})
                totals[key]["quantity"] += float(per_item_quantity) * quantity

        result = []
        for ingredient, payload in sorted(totals.items()):
            result.append(
                {
                    "ingredient": ingredient,
                    "quantity": round(payload["quantity"], 2),
                    "unit": payload["unit"],
                }
            )
        return result
