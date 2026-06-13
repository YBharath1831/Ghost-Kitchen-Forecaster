
import React from "react";
import type { ScenarioState, WeatherCondition, EventType } from "../types";

const weatherOptions: WeatherCondition[] = ["Sunny", "Cloudy", "Rainy", "Stormy"];
const eventOptions: EventType[] = ["No Event", "Sports Game", "Concert"];

interface ScenarioSimulatorProps {
  scenario: ScenarioState;
  setScenario: React.Dispatch<React.SetStateAction<ScenarioState>>;
  forecast: { [key: string]: number };
}

const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  scenario,
  setScenario,
  forecast,
}) => {
  return (
    <aside className="sidebar-card">
      <div className="card-header">
        <h2>Scenario simulator</h2>
        <p>Adjust tomorrow's conditions and watch the forecast change immediately.</p>
      </div>

      <label className="control">
        <span>Date</span>
        <input
          type="date"
          value={scenario.date}
          onChange={(event) =>
            setScenario((current) => ({ ...current, date: event.target.value }))
          }
        />
      </label>

      <label className="control">
        <span>Temperature: {scenario.temperature}°C</span>
        <input
          type="range"
          min="0"
          max="45"
          value={scenario.temperature}
          onChange={(event) =>
            setScenario((current) => ({
              ...current,
              temperature: Number(event.target.value),
            }))
          }
        />
      </label>

      <label className="control">
        <span>Weather</span>
        <select
          value={scenario.weather_condition}
          onChange={(event) =>
            setScenario((current) => ({
              ...current,
              weather_condition: event.target.value as WeatherCondition,
            }))
          }
        >
          {weatherOptions.map((weather) => (
            <option key={weather} value={weather}>
              {weather}
            </option>
          ))}
        </select>
      </label>

      <label className="control">
        <span>Event</span>
        <select
          value={scenario.event}
          onChange={(event) =>
            setScenario((current) => ({
              ...current,
              event: event.target.value as EventType,
            }))
          }
        >
          {eventOptions.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
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
  );
};

export default ScenarioSimulator;
