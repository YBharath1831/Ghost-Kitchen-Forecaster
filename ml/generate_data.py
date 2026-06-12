from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd


OUTPUT_FILE = Path(__file__).resolve().parents[1] / "data" / "historical_sales.csv"


def build_dataset() -> pd.DataFrame:
    np.random.seed(42)
    start_date = datetime(2024, 1, 1)
    num_days = 730

    date_list = [start_date + timedelta(days=offset) for offset in range(num_days)]
    rows: list[dict[str, object]] = []

    for current_date in date_list:
        month = current_date.month
        if month in {6, 7, 8}:
            base_temp = np.random.normal(30, 3)
            weather = np.random.choice(["Sunny", "Cloudy", "Rainy"], p=[0.7, 0.2, 0.1])
        elif month in {12, 1, 2}:
            base_temp = np.random.normal(12, 4)
            weather = np.random.choice(["Sunny", "Cloudy", "Rainy", "Stormy"], p=[0.3, 0.4, 0.2, 0.1])
        else:
            base_temp = np.random.normal(21, 3)
            weather = np.random.choice(["Sunny", "Cloudy", "Rainy"], p=[0.5, 0.3, 0.2])

        is_weekend = int(current_date.weekday() in {4, 5, 6})
        event_probability = 0.30 if is_weekend else 0.05
        local_event = int(np.random.choice([1, 0], p=[event_probability, 1 - event_probability]))

        burger_sales = 50 + (is_weekend * 20) + (local_event * 35) + (12 if weather in {"Rainy", "Stormy"} else 0)
        if base_temp > 28:
            burger_sales -= 10
        burger_sales += np.random.normal(0, 5)

        pizza_sales = 40 + (is_weekend * 35) + (local_event * 55) + (25 if weather == "Stormy" else 5 if weather == "Rainy" else 0)
        pizza_sales += np.random.normal(0, 6)

        salad_sales = 30 + (20 if base_temp > 25 else -10 if base_temp < 15 else 0) - (20 if weather in {"Rainy", "Stormy"} else 0)
        salad_sales += np.random.normal(0, 4)

        rows.append(
            {
                "date": current_date.strftime("%Y-%m-%d"),
                "day_of_week": current_date.strftime("%A"),
                "is_weekend": is_weekend,
                "temperature": round(float(base_temp), 1),
                "weather_condition": weather,
                "local_event": local_event,
                "Burgers": max(10, int(burger_sales)),
                "Pizzas": max(5, int(pizza_sales)),
                "Salads": max(2, int(salad_sales)),
            }
        )

    return pd.DataFrame(rows)


def main() -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    dataset = build_dataset()
    dataset.to_csv(OUTPUT_FILE, index=False)
    print(f"Wrote {len(dataset)} rows to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
