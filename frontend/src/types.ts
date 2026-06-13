export type WeatherCondition = "Sunny" | "Cloudy" | "Rainy" | "Stormy";
export type EventType = "No Event" | "Sports Game" | "Concert";

export interface ScenarioState {
  date: string;
  temperature: number;
  weather_condition: WeatherCondition;
  event: EventType;
}

export interface IngredientPrepItem {
  ingredient: string;
  quantity: number;
  unit: string;
}

export interface ForecastResponse {
  date: string;
  model_source: string;
  predictions: Record<string, number>;
  ingredient_prep: IngredientPrepItem[];
  scenario: ScenarioState;
}

export interface ModelMetrics {
  source: string;
  metrics: Record<string, number> | null;
}

export interface HistoricalSalesEntry {
  date: string;
  [key: string]: string | number;
}
