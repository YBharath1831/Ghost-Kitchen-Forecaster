import type { IngredientPrepItem, ScenarioState } from "../types";

const recipeMap: Record<string, Record<string, number>> = {
  Burgers: {
    Buns: 1,
    Patty_kg: 0.18,
    Cheese_Slices: 1,
    Lettuce_g: 20,
    Tomato_g: 25,
    Sauce_ml: 15,
  },
  Pizzas: {
    Dough_Base: 1,
    Cheese_kg: 0.15,
    Tomato_Sauce_ml: 120,
    Toppings_kg: 0.08,
  },
  Salads: {
    Greens_kg: 0.12,
    Veg_Mix_kg: 0.08,
    Dressing_ml: 20,
  },
};

export function buildLocalIngredientPrep(predictions: Record<string, number>): IngredientPrepItem[] {
  const totals: Record<string, { quantity: number; unit: string }> = {};

  Object.entries(predictions).forEach(([menuItem, quantity]) => {
    const recipe = recipeMap[menuItem] ?? {};
    Object.entries(recipe).forEach(([ingredient, perItemQuantity]) => {
      let key = ingredient;
      let unit = "units";

      if (ingredient.endsWith("_kg")) {
        key = ingredient.slice(0, -3);
        unit = "kg";
      } else if (ingredient.endsWith("_g")) {
        key = ingredient.slice(0, -2);
        unit = "g";
      } else if (ingredient.endsWith("_ml")) {
        key = ingredient.slice(0, -3);
        unit = "ml";
      }

      totals[key] ??= { quantity: 0, unit };
      totals[key].quantity += perItemQuantity * quantity;
    });
  });

  return Object.entries(totals)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ingredient, payload]) => ({
      ingredient,
      quantity: Number(payload.quantity.toFixed(2)),
      unit: payload.unit,
    }));
}

export function buildLocalScenarioLabel(scenario: ScenarioState) {
  return `${scenario.weather_condition} / ${scenario.event ? "event" : "no event"}`;
}
