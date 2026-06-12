import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastResponse, ScenarioState, WeatherCondition } from "./types";
import { buildLocalForecast } from "./lib/forecast";
import { buildLocalIngredientPrep } from "./lib/recipes";

const weatherOptions: WeatherCondition[] = ["Sunny", "Cloudy", "Rainy", "Stormy"];

const historicalSeries = [
  { day: "Mon", sales: 72 },
  { day: "Tue", sales: 68 },
  { day: "Wed", sales: 75 },
  { day: "Thu", sales: 81 },
  { day: "Fri", sales: 88 },
  { day: "Sat", sales: 104 },
  { day: "Sun", sales: 97 },
];

const ingredientPalette = ["#f97316", "#eab308", "#14b8a6", "#60a5fa", "#f43f5e", "#a78bfa"];

function formatQuantity(quantity: number) {
  return quantity % 1 === 0 ? quantity.toFixed(0) : quantity.toFixed(2);
}

export default function App() {
  const [scenario, setScenario] = useState<ScenarioState>({
    date: new Date().toISOString().slice(0, 10),
    temperature: 24,
    weather_condition: "Sunny",
    local_event: false,
  });
  const [response, setResponse] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const localPredictions = useMemo(() => buildLocalForecast(scenario), [scenario]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPrediction() {
      setIsLoading(true);
      try {
        const { data } = await axios.post<ForecastResponse>("http://localhost:8000/api/predict", scenario, {
          signal: controller.signal,
        });
        setResponse(data);
      } catch {
        const fallbackPredictions = buildLocalForecast(scenario);
        setResponse({
          date: scenario.date,
          model_source: "frontend-fallback",
          predictions: fallbackPredictions,
          ingredient_prep: buildLocalIngredientPrep(fallbackPredictions),
          scenario,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrediction();

    return () => controller.abort();
  }, [scenario, localPredictions]);

  const forecast = response?.predictions ?? localPredictions;
  const ingredientRows = response?.ingredient_prep ?? [];
  const forecastSeries = historicalSeries.map((entry, index) => {
    const menuMix = Object.values(forecast).reduce((sum, value) => sum + value, 0);
    const scaledForecast = Math.round(menuMix / 3 + index * 2);
    return {
      day: entry.day,
      historical: entry.sales,
      forecast: scaledForecast,
    };
  });

  return (
    <div className="app-shell">
      <main className="dashboard-grid">
        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Ghost Kitchen Forecaster</p>
            <h1>Plan tomorrow&apos;s prep before the first order lands.</h1>
            <p className="hero-text">
              Compare historical demand with a scenario-driven prediction, then translate item volume into ingredient prep in one glance.
            </p>
            <div className="status-row">
              <span className={`status-pill ${response?.model_source === "trained-model" ? "success" : "muted"}`}>
                {isLoading ? "Updating forecast" : response?.model_source ?? "offline-baseline"}
              </span>
              <span className="status-pill subtle">No login required</span>
            </div>
          </div>

          <div className="chart-card">
            <div className="card-header">
              <h2>Historical vs predicted demand</h2>
              <p>Line chart for prep planning and quick scenario comparison.</p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={forecastSeries} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                <XAxis dataKey="day" tick={{ fill: "rgba(232, 239, 255, 0.75)" }} />
                <YAxis tick={{ fill: "rgba(232, 239, 255, 0.75)" }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(13, 18, 36, 0.96)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    color: "#e8efff",
                  }}
                />
                <Bar dataKey="historical" radius={[10, 10, 0, 0]} fill="#60a5fa" />
                <Bar dataKey="forecast" radius={[10, 10, 0, 0]} fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <aside className="sidebar-card">
          <div className="card-header">
            <h2>Scenario simulator</h2>
            <p>Adjust tomorrow&apos;s conditions and watch the forecast change immediately.</p>
          </div>

          <label className="control">
            <span>Date</span>
            <input
              type="date"
              value={scenario.date}
              onChange={(event) => setScenario((current) => ({ ...current, date: event.target.value }))}
            />
          </label>

          <label className="control">
            <span>Temperature: {scenario.temperature}°C</span>
            <input
              type="range"
              min="0"
              max="45"
              value={scenario.temperature}
              onChange={(event) => setScenario((current) => ({ ...current, temperature: Number(event.target.value) }))}
            />
          </label>

          <label className="control">
            <span>Weather</span>
            <select
              value={scenario.weather_condition}
              onChange={(event) =>
                setScenario((current) => ({ ...current, weather_condition: event.target.value as WeatherCondition }))
              }
            >
              {weatherOptions.map((weather) => (
                <option key={weather} value={weather}>
                  {weather}
                </option>
              ))}
            </select>
          </label>

          <label className="toggle-control">
            <div>
              <span>Local event</span>
              <p>Boosts burger and pizza demand when true.</p>
            </div>
            <input
              type="checkbox"
              checked={scenario.local_event}
              onChange={(event) => setScenario((current) => ({ ...current, local_event: event.target.checked }))}
            />
          </label>

          <div className="forecast-summary">
            {Object.entries(forecast).map(([menuItem, quantity]) => (
              <div key={menuItem} className="summary-tile">
                <span>{menuItem}</span>
                <strong>{quantity}</strong>
              </div>
            ))}
          </div>
        </aside>

        <section className="prep-card">
          <div className="card-header">
            <h2>Raw ingredient prep list</h2>
            <p>Converted directly from the forecasted menu item demand.</p>
          </div>

          {ingredientRows.length > 0 ? (
            <div className="prep-grid">
              {ingredientRows.map((item, index) => (
                <article key={item.ingredient} className="prep-item">
                  <span className="prep-dot" style={{ backgroundColor: ingredientPalette[index % ingredientPalette.length] }} />
                  <div>
                    <h3>{item.ingredient}</h3>
                    <p>
                      {formatQuantity(item.quantity)} {item.unit}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="prep-empty">
              <p>The backend will populate ingredient prep here. Start the API to see live totals.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
