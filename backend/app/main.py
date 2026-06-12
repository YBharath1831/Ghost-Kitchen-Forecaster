import sys
from pathlib import Path
from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


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
