from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import joblib

# Allow direct execution from the ml/ directory.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.config import MODEL_BUNDLE_FILE
from backend.app.services import ForecastService


def load_model_bundle(model_bundle_file: Path = MODEL_BUNDLE_FILE) -> dict[str, Any] | None:
    if not model_bundle_file.exists():
        return None
    return joblib.load(model_bundle_file)


def predict_menu_items(payload: dict[str, Any]) -> dict[str, int]:
    forecast_service = ForecastService()
    _, predictions = forecast_service.predict(payload)
    return predictions


def predict_with_ingredients(payload: dict[str, Any]) -> dict[str, Any]:
    forecast_service = ForecastService()
    model_source, predictions = forecast_service.predict(payload)
    return {
        "model_source": model_source,
        "predictions": predictions,
        "ingredient_prep": forecast_service.build_ingredient_prep(predictions),
    }


if __name__ == "__main__":
    sample_payload = {
        "date": "2026-06-13",
        "temperature": 26,
        "weather_condition": "Sunny",
        "local_event": False,
    }
    result = predict_with_ingredients(sample_payload)
    print(result)
