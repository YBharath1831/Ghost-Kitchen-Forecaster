import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { ForecastResponse, ScenarioState, HistoricalSalesEntry, ModelMetrics } from "./types";
import { buildLocalForecast } from "./lib/forecast";
import { buildLocalIngredientPrep } from "./lib/recipes";
import Hero from "./components/Hero";
import DemandChart from "./components/DemandChart";
import PrepList from "./components/PrepList";
import ScenarioSimulator from "./components/ScenarioSimulator";
import ModelStatus from "./components/ModelStatus";

function formatChartDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return dateStr;
  }
}

export default function App() {
  const [scenario, setScenario] = useState<ScenarioState>({
    date: new Date().toISOString().slice(0, 10),
    temperature: 24,
    weather_condition: "Sunny",
    event: "No Event",
  });
  const [response, setResponse] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historicalSales, setHistoricalSales] = useState<HistoricalSalesEntry[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);

  const localPredictions = useMemo(() => buildLocalForecast(scenario), [scenario]);

  useEffect(() => {
    // Fetch metrics
    axios.get<ModelMetrics>("http://localhost:8000/api/metrics")
      .then(({ data }) => setModelMetrics(data))
      .catch(() => setModelMetrics({ source: "frontend-fallback", metrics: null }));

    // Fetch historical data
    axios.get<HistoricalSalesEntry[]>("http://localhost:8000/api/historical")
      .then(({ data }) => setHistoricalSales(data))
      .catch(() => {
        setHistoricalSales([
          { date: "2026-06-06", Burgers: 69, Pizzas: 78, Salads: 54 },
          { date: "2026-06-07", Burgers: 62, Pizzas: 83, Salads: 52 },
          { date: "2026-06-08", Burgers: 60, Pizzas: 77, Salads: 48 },
          { date: "2026-06-09", Burgers: 46, Pizzas: 41, Salads: 50 },
          { date: "2026-06-10", Burgers: 53, Pizzas: 38, Salads: 50 },
          { date: "2026-06-11", Burgers: 59, Pizzas: 48, Salads: 30 },
          { date: "2026-06-12", Burgers: 40, Pizzas: 40, Salads: 47 },
        ]);
      });
  }, []);

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
  }, [scenario]);

  const forecast = response?.predictions ?? localPredictions;
  const ingredientRows = response?.ingredient_prep ?? [];

  const chartData = useMemo(() => {
    const historicalEntries = historicalSales.map(entry => ({
      label: formatChartDate(entry.date),
      Burgers: entry.Burgers,
      Pizzas: entry.Pizzas,
      Salads: entry.Salads,
      isForecast: false,
    }));

    const tomorrowEntry = {
      label: 'Tomorrow',
      Burgers: forecast.Burgers ?? 0,
      Pizzas: forecast.Pizzas ?? 0,
      Salads: forecast.Salads ?? 0,
      isForecast: true,
    };

    return [...historicalEntries, tomorrowEntry];
  }, [historicalSales, forecast]);

  // Sync forecast source to metrics component for consistency if predict returns fallback
  const activeMetrics = useMemo(() => {
    if (response?.model_source) {
      return {
        source: response.model_source,
        metrics: response.model_source === 'trained-model' ? modelMetrics?.metrics ?? null : null,
      };
    }
    return modelMetrics;
  }, [response, modelMetrics]);

  return (
    <div className="app-shell">
      <main className="dashboard-grid">
        <section className="hero-card">
          <Hero isLoading={isLoading} modelSource={response?.model_source ?? modelMetrics?.source} />
          <DemandChart data={chartData} />
        </section>

        <ScenarioSimulator
          scenario={scenario}
          setScenario={setScenario}
          forecast={forecast}
        />

        <ModelStatus metrics={activeMetrics} />

        <PrepList ingredientRows={ingredientRows} />
      </main>
    </div>
  );
}
