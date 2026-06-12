# Ghost-Kitchen-Forecaster
The Ghost Kitchen Demand Forecaster is an AI-powered inventory optimization tool. It predicts next-day order volumes for menu items by analyzing historical sales data alongside external triggers (weather and local events). This allows kitchens to optimize raw ingredient preparation, reducing perishable food waste and preventing stockouts.

## Current Scaffold

The repository now includes:

- A FastAPI backend with `POST /api/predict`
- A synthetic data generator and tree-based training pipeline
- A Vite + React dashboard with scenario controls, forecast charts, and ingredient prep output
- A shared recipe mapping in `shared/recipes.json`

## Local Run Flow

1. Generate training data with `python ml/generate_data.py`
2. Train the model bundle with `python ml/train.py`
3. Start the API with `uvicorn backend.app.main:app --reload --port 8000`
4. Install frontend dependencies in `frontend/` and run `npm run dev`

