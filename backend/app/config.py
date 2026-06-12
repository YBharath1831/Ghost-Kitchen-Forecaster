from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
SHARED_DIR = BASE_DIR / "shared"
DATA_DIR = BASE_DIR / "data"
ML_DIR = BASE_DIR / "ml"
ARTIFACTS_DIR = ML_DIR / "artifacts"
RECIPE_FILE = SHARED_DIR / "recipes.json"
TRAINING_DATA_FILE = DATA_DIR / "historical_sales.csv"
MODEL_BUNDLE_FILE = ARTIFACTS_DIR / "model_bundle.joblib"
 