import json
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import pandas as pd

from .config import MODEL_BUNDLE_FILE, RECIPE_FILE


def load_recipe_mapping(recipe_file: Path = RECIPE_FILE) -> Dict[str, Dict[str, float]]:
    with recipe_file.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_feature_frame(scenario: Dict[str, Any]) -> pd.DataFrame:
    scenario_date = scenario["date"]
    if isinstance(scenario_date, str):
        scenario_date = date.fromisoformat(scenario_date)

    return pd.DataFrame(
        [
            {
                "day_of_week": scenario_date.strftime("%A"),
                "is_weekend": int(scenario_date.weekday() >= 4),
                "temperature": float(scenario["temperature"]),
                "weather_condition": scenario["weather_condition"],
                "local_event": int(bool(scenario["local_event"])),
            }
        ]
    )


def strip_suffix(value: str, suffix: str) -> str:
    if value.endswith(suffix):
        return value[: -len(suffix)]
    return value


class ForecastService:
    def __init__(self, model_bundle_file: Path = MODEL_BUNDLE_FILE) -> None:
        self.model_bundle_file = model_bundle_file
        self.recipe_mapping = load_recipe_mapping()
        self._bundle = self._load_bundle()

    def _load_bundle(self) -> Optional[Dict[str, Any]]:
        if not self.model_bundle_file.exists():
            return None
        return joblib.load(self.model_bundle_file)

    def predict(self, scenario: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        feature_frame = build_feature_frame(scenario)

        if self._bundle and "models" in self._bundle:
            predictions = {}
            for item_name, model in self._bundle["models"].items():
                value = model.predict(feature_frame)[0]
                predictions[item_name] = max(0, int(round(value)))
            return "trained-model", predictions

        return "offline-baseline", self._fallback_prediction(scenario)

    def _fallback_prediction(self, scenario: Dict[str, Any]) -> Dict[str, int]:
        scenario_date = scenario["date"]
        if isinstance(scenario_date, str):
            scenario_date = date.fromisoformat(scenario_date)

        is_weekend = scenario_date.weekday() >= 4
        weather = scenario["weather_condition"]
        temp = float(scenario["temperature"])
        event = bool(scenario["local_event"])

        burger = 52 + (16 if is_weekend else 0) + (28 if event else 0) + (8 if weather in {"Rainy", "Stormy"} else 0)
        pizza = 41 + (24 if is_weekend else 0) + (34 if event else 0) + (20 if weather == "Stormy" else 6 if weather == "Rainy" else 0)
        salad = 29 + (18 if temp > 25 else -8 if temp < 15 else 0) - (14 if weather in {"Rainy", "Stormy"} else 0)

        return {
            "Burgers": max(0, int(round(burger))),
            "Pizzas": max(0, int(round(pizza))),
            "Salads": max(0, int(round(salad))),
        }

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
