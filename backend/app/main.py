import sys
from pathlib import Path
from typing import Dict, List, Any

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import TRAINING_DATA_FILE


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.schemas import PredictionRequest, PredictionResponse
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


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


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
            records = last_7[["date", "Burgers", "Pizzas", "Salads"]].to_dict(orient="records")
            return records
    except Exception:
        pass

    return [
        {"date": "2026-06-06", "Burgers": 69, "Pizzas": 78, "Salads": 54},
        {"date": "2026-06-07", "Burgers": 62, "Pizzas": 83, "Salads": 52},
        {"date": "2026-06-08", "Burgers": 60, "Pizzas": 77, "Salads": 48},
        {"date": "2026-06-09", "Burgers": 46, "Pizzas": 41, "Salads": 50},
        {"date": "2026-06-10", "Burgers": 53, "Pizzas": 38, "Salads": 50},
        {"date": "2026-06-11", "Burgers": 59, "Pizzas": 48, "Salads": 30},
        {"date": "2026-06-12", "Burgers": 40, "Pizzas": 40, "Salads": 47},
    ]


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
