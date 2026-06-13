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


DEFAULT_SYSTEM_PROMPT = (
    "You are an expert chef and demand-forecasting assistant for a ghost kitchen. "
    "Predict the daily order quantity for each menu item based on historical sales trends, "
    "temperature, weather conditions, whether it is a weekend, and local events. "
    "Be concise and accurate. Only output the JSON object — no explanation needed."
)


class AISettings(BaseModel):
    use_ai: bool = False
    api_key: str = ""
    model_name: str = "gemini-1.5-flash"
    system_prompt: str = DEFAULT_SYSTEM_PROMPT

