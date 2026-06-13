import io
import sys
import json
from pathlib import Path
from typing import Dict, List, Any

import joblib
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.app.config import TRAINING_DATA_FILE, RECIPE_FILE, SETTINGS_FILE


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.schemas import PredictionRequest, PredictionResponse, AISettings
from backend.app.services import ForecastService


app = FastAPI(title="Ghost Kitchen Forecaster", version="0.1.0")
forecast_service = ForecastService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Only the core features are strictly required now
REQUIRED_COLUMNS = {
    "date", "day_of_week", "is_weekend", "temperature",
    "weather_condition", "local_event"
}
VALID_WEATHER = {"Sunny", "Cloudy", "Rainy", "Stormy"}
VALID_DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
MIN_ROWS = 30

# Example template that users can adapt
TEMPLATE_CSV = """date,day_of_week,is_weekend,temperature,weather_condition,local_event,Tacos,Burritos
2026-01-01,Wednesday,0,18.5,Sunny,0,52,45
2026-01-02,Thursday,0,14.2,Cloudy,0,48,39
2026-01-03,Friday,1,20.1,Rainy,1,98,120
"""


TEMPLATE_RECIPES_JSON = """{
  "Tacos": {
    "Taco_Shell": 1,
    "Beef_g": 80,
    "Lettuce_g": 10
  },
  "Burritos": {
    "Tortilla": 1,
    "Beef_g": 120,
    "Rice_g": 50,
    "Beans_g": 40
  }
}
"""

@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/settings")
def get_settings() -> Dict[str, Any]:
    """Return current AI settings (api_key is masked for display)."""
    settings = AISettings()
    if SETTINGS_FILE.exists():
        try:
            raw = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            settings = AISettings(**raw)
        except Exception:
            pass
    result = settings.model_dump()
    # Mask the key for the frontend: only send length hint
    if result.get("api_key"):
        result["api_key_set"] = True
        result["api_key"] = ""  # Never send the raw key back to the browser
    else:
        result["api_key_set"] = False
    return result


@app.post("/api/settings")
def save_settings(payload: AISettings) -> Dict[str, Any]:
    """Persist AI settings to shared/settings.json."""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    # If the frontend sent an empty api_key, preserve the previously stored key
    if not payload.api_key and SETTINGS_FILE.exists():
        try:
            existing = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            payload = AISettings(**{**existing, **payload.model_dump(exclude={"api_key"})})
        except Exception:
            pass
    SETTINGS_FILE.write_text(payload.model_dump_json(indent=2), encoding="utf-8")
    return {"status": "saved"}


@app.get("/api/metrics")
def get_metrics() -> Dict[str, Any]:
    metrics = forecast_service.get_metrics()
    if metrics:
        return {"source": "trained-model", "metrics": metrics}
    return {"source": "offline-baseline", "metrics": None}


@app.get("/api/historical")
def get_historical() -> List[Dict[str, Any]]:
    try:
        if TRAINING_DATA_FILE.exists():
            df = pd.read_csv(TRAINING_DATA_FILE)
            last_7 = df.tail(7)
            # Find target columns (everything except the required feature columns)
            target_cols = [col for col in df.columns if col not in REQUIRED_COLUMNS and col != "date"]
            records = last_7[["date"] + target_cols].to_dict(orient="records")
            return records
    except Exception:
        pass

    # Fallback default data for demo mode if no data uploaded
    return [
        {"date": "2026-06-06", "Burgers": 69, "Pizzas": 78, "Salads": 54},
        {"date": "2026-06-07", "Burgers": 62, "Pizzas": 83, "Salads": 52},
        {"date": "2026-06-08", "Burgers": 60, "Pizzas": 77, "Salads": 48},
        {"date": "2026-06-09", "Burgers": 46, "Pizzas": 41, "Salads": 50},
        {"date": "2026-06-10", "Burgers": 53, "Pizzas": 38, "Salads": 50},
        {"date": "2026-06-11", "Burgers": 59, "Pizzas": 48, "Salads": 30},
        {"date": "2026-06-12", "Burgers": 40, "Pizzas": 40, "Salads": 47},
    ]


@app.get("/api/template")
def download_template():
    """Return a ready-to-fill CSV template for custom kitchen data."""
    return StreamingResponse(
        io.StringIO(TEMPLATE_CSV),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ghost_kitchen_template.csv"},
    )


@app.get("/api/template-recipes")
def download_template_recipes():
    """Return a sample JSON template for custom recipes data."""
    return StreamingResponse(
        io.StringIO(TEMPLATE_RECIPES_JSON),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=ghost_kitchen_recipes_template.json"},
    )


@app.post("/api/upload-data")
async def upload_data(csv_file: UploadFile = File(...), recipes_file: UploadFile = File(...)) -> Dict[str, Any]:
    """Validate and save an uploaded CSV and recipes JSON for training."""
    if not csv_file.filename or not csv_file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Sales file must be a .csv file.")
    if not recipes_file.filename or not recipes_file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Recipes file must be a .json file.")

    # 1. Parse CSV
    try:
        csv_content = await csv_file.read()
        df = pd.read_csv(io.BytesIO(csv_content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}")

    # 2. Parse Recipes JSON
    try:
        recipes_content = await recipes_file.read()
        recipes_data = json.loads(recipes_content)
        if not isinstance(recipes_data, dict):
            raise HTTPException(status_code=400, detail="Recipes JSON must be an object at the root.")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse Recipes JSON: {exc}")

    # Column presence check
    missing = REQUIRED_COLUMNS - set(df.columns.tolist())
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required feature columns: {', '.join(sorted(missing))}. "
                   f"Please download the template for the exact format."
        )

    # Row count check
    if len(df) < MIN_ROWS:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset has only {len(df)} rows. A minimum of {MIN_ROWS} rows is required for training."
        )

    # Weather condition check
    bad_weather = set(df["weather_condition"].dropna().unique()) - VALID_WEATHER
    if bad_weather:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid weather_condition values: {bad_weather}. Allowed: {VALID_WEATHER}"
        )

    # Day of week check
    bad_days = set(df["day_of_week"].dropna().unique()) - VALID_DAYS
    if bad_days:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid day_of_week values: {bad_days}. Allowed: {VALID_DAYS}"
        )

    # Numeric range checks
    if not df["temperature"].between(-20, 60).all():
        raise HTTPException(status_code=400, detail="temperature values must be between -20 and 60.")
    if not df["is_weekend"].isin([0, 1]).all():
        raise HTTPException(status_code=400, detail="is_weekend must be 0 or 1.")
    if not df["local_event"].isin([0, 1]).all():
        raise HTTPException(status_code=400, detail="local_event must be 0 or 1.")

    # Target items validation
    target_items = [col for col in df.columns if col not in REQUIRED_COLUMNS]
    if not target_items:
        raise HTTPException(status_code=400, detail="No menu item columns found to predict.")

    # Validate all target items exist in the recipes
    missing_recipes = [item for item in target_items if item not in recipes_data]
    if missing_recipes:
        raise HTTPException(
            status_code=400,
            detail=f"Missing recipes for items found in sales data: {', '.join(missing_recipes)}. "
                   f"Please ensure every item has a key in the recipes JSON."
        )

    for col in target_items:
        if (df[col] < 0).any():
            raise HTTPException(status_code=400, detail=f"{col} values must be non-negative.")

    # Save validated CSV and JSON
    TRAINING_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(TRAINING_DATA_FILE, index=False)
    
    RECIPE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(RECIPE_FILE, "w") as f:
        json.dump(recipes_data, f, indent=2)

    return {
        "status": "ok",
        "rows_saved": len(df),
        "items": target_items,
        "message": f"Successfully saved {len(df)} rows and recipes for {len(target_items)} items. Ready to train!"
    }


@app.post("/api/retrain")
def retrain_model() -> Dict[str, Any]:
    """Retrain the ML model on the current training dataset and hot-reload it."""
    if not TRAINING_DATA_FILE.exists():
        raise HTTPException(status_code=404, detail="No training data found. Please upload your kitchen data first.")

    try:
        from ml.train import train_and_evaluate
        artifact = train_and_evaluate()
        forecast_service.reload()
        return {
            "status": "ok",
            "metrics": artifact["metrics"],
            "rows_trained": len(pd.read_csv(TRAINING_DATA_FILE)),
            "message": "Model successfully retrained on your custom menu!"
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Training failed: {exc}")


@app.post("/api/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    model_source, predictions = forecast_service.predict(request.dict())
    ingredient_prep = forecast_service.build_ingredient_prep(predictions)

    return PredictionResponse(
        date=request.date,
        model_source=model_source,
        predictions=predictions,
        ingredient_prep=ingredient_prep,
        scenario=request,
    )
