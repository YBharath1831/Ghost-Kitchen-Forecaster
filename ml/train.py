from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    from xgboost import XGBRegressor
except Exception:  # pragma: no cover - xgboost is optional in local setup
    XGBRegressor = None


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_FILE = BASE_DIR / "data" / "historical_sales.csv"
MODEL_FILE = BASE_DIR / "ml" / "artifacts" / "model_bundle.joblib"

FEATURE_COLUMNS = ["day_of_week", "is_weekend", "temperature", "weather_condition", "local_event"]


def load_training_data() -> pd.DataFrame:
    if not DATA_FILE.exists():
        try:
            from .generate_data import main as generate_data_main
        except ImportError:  # pragma: no cover - supports direct script execution
            from generate_data import main as generate_data_main

        generate_data_main()
    return pd.read_csv(DATA_FILE)


def build_pipeline() -> Pipeline:
    encoder = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                ["day_of_week", "weather_condition"],
            )
        ],
        remainder="passthrough",
    )

    if XGBRegressor is not None:
        estimator = XGBRegressor(
            n_estimators=250,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=42,
            objective="reg:squarederror",
        )
    else:
        estimator = RandomForestRegressor(
            n_estimators=250,
            max_depth=8,
            random_state=42,
        )

    return Pipeline(
        steps=[
            ("encoder", encoder),
            ("model", estimator),
        ]
    )


def train_and_evaluate() -> dict[str, object]:
    frame = load_training_data().sort_values("date").reset_index(drop=True)
    split_index = int(len(frame) * 0.8)
    train_frame = frame.iloc[:split_index]
    test_frame = frame.iloc[split_index:]

    target_columns = [col for col in frame.columns if col not in FEATURE_COLUMNS and col != "date"]

    models = {}
    metrics: dict[str, float] = {}

    for target_column in target_columns:
        pipeline = build_pipeline()
        pipeline.fit(train_frame[FEATURE_COLUMNS], train_frame[target_column])
        predictions = pipeline.predict(test_frame[FEATURE_COLUMNS])
        mae = mean_absolute_error(test_frame[target_column], predictions)
        models[target_column] = pipeline
        metrics[target_column] = float(mae)

    MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    artifact = {
        "models": models,
        "feature_columns": FEATURE_COLUMNS,
        "target_columns": target_columns,
        "metrics": metrics,
    }
    joblib.dump(artifact, MODEL_FILE)
    return artifact


def main() -> None:
    artifact = train_and_evaluate()
    print("Training complete")
    for target, mae in artifact["metrics"].items():
        print(f"{target}: MAE={mae:.2f}")
    print(f"Saved model bundle to {MODEL_FILE}")


if __name__ == "__main__":
    main()
