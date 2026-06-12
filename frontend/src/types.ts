export type WeatherCondition = "Sunny" | "Cloudy" | "Rainy" | "Stormy";

export interface ScenarioState {
  date: string;
  temperature: number;
  weather_condition: WeatherCondition;
  local_event: boolean;
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
