import type { ScenarioState } from "../types";

export function buildLocalForecast(scenario: ScenarioState): Record<string, number> {
  const currentDate = new Date(scenario.date);
  const isWeekend = [5, 6, 0].includes(currentDate.getDay());
  const { weather_condition: weather, event, temperature } = scenario;

  const hasEvent = event && event !== "No Event";

  const burgers = 52 + (isWeekend ? 16 : 0) + (hasEvent ? 28 : 0) + (["Rainy", "Stormy"].includes(weather) ? 8 : 0);
  const pizzas = 41 + (isWeekend ? 24 : 0) + (hasEvent ? 34 : 0) + (weather === "Stormy" ? 20 : weather === "Rainy" ? 6 : 0);
  const salads = 29 + (temperature > 25 ? 18 : temperature < 15 ? -8 : 0) - (["Rainy", "Stormy"].includes(weather) ? 14 : 0);

  return {
    Burgers: Math.max(0, Math.round(burgers)),
    Pizzas: Math.max(0, Math.round(pizzas)),
    Salads: Math.max(0, Math.round(salads)),
  };
}
