from datetime import date

try:
    from typing import Literal
except ImportError:
    from typing_extensions import Literal

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    date: date
    temperature: float = Field(..., ge=-20, le=60)
    weather_condition: Literal["Sunny", "Cloudy", "Rainy", "Stormy"]
    event: Literal["No Event", "Sports Game", "Concert"]


class IngredientPrepItem(BaseModel):
    ingredient: str
    quantity: float
    unit: str


class PredictionResponse(BaseModel):
    date: date
    model_source: str
    predictions: dict
    ingredient_prep: list
    scenario: PredictionRequest
