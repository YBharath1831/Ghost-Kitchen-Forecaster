
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import type { ForecastResponse, ScenarioState } from "./types";
import { buildLocalForecast } from "./lib/forecast";
import { buildLocalIngredientPrep } from "./lib/recipes";
import Hero from "./components/Hero";
import DemandChart from "./components/DemandChart";
import PrepList from "./components/PrepList";
import ScenarioSimulator from "./components/ScenarioSimulator";

const historicalSeries = [
  { day: "Mon", sales: 72 },
  { day: "Tue", sales: 68 },
  { day: "Wed", sales: 75 },
  { day: "Thu", sales: 81 },
  { day: "Fri", sales: 88 },
  { day: "Sat", sales: 104 },
  { day: "Sun", sales: 97 },
];

export default function App() {
  const [scenario, setScenario] = useState<ScenarioState>({
    date: new Date().toISOString().slice(0, 10),
    temperature: 24,
    weather_condition: "Sunny",
    event: "No Event",
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
          <Hero isLoading={isLoading} modelSource={response?.model_source} />
          <DemandChart data={forecastSeries} />
        </section>

        <ScenarioSimulator
          scenario={scenario}
          setScenario={setScenario}
          forecast={forecast}
        />

        <PrepList ingredientRows={ingredientRows} />
      </main>
    </div>
  );
}
