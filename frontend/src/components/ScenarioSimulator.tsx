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
  const currentDate = new Date(scenario.date);
  const isWeekend = [5, 6, 0].includes(currentDate.getDay());
  const { weather_condition: weather, event, temperature } = scenario;

  const drivers = [];
  if (isWeekend) {
    drivers.push({
      id: "weekend",
      label: "📅 Weekend Surge (+16 Burgers, +24 Pizzas)",
      className: "driver-positive",
    });
  }
  if (event && event !== "No Event") {
    drivers.push({
      id: "event",
      label: `🏆 ${event} (+28 Burgers, +34 Pizzas)`,
      className: "driver-positive",
    });
  }
  if (weather === "Rainy") {
    drivers.push({
      id: "rainy",
      label: "🌧️ Rainy (+8 Burgers, +6 Pizzas, -14 Salads)",
      className: "driver-mixed",
    });
  } else if (weather === "Stormy") {
    drivers.push({
      id: "stormy",
      label: "⛈️ Stormy (+8 Burgers, +20 Pizzas, -14 Salads)",
      className: "driver-mixed",
    });
  }
  if (temperature > 25) {
    drivers.push({
      id: "hot",
      label: `🔥 Hot Temp ${temperature}°C (+18 Salads)`,
      className: "driver-positive",
    });
  } else if (temperature < 15) {
    drivers.push({
      id: "cold",
      label: `❄️ Cold Temp ${temperature}°C (-8 Salads)`,
      className: "driver-negative",
    });
  }

  return (
    <aside className="sidebar-card">
      <div className="card-header">
        <h2>Scenario simulator</h2>
        <p>Adjust tomorrow's conditions and watch the forecast change immediately.</p>
      </div>

      <div className="simulator-controls">
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
      </div>

      <div className="scenario-drivers">
        <h3>Active Demand Drivers</h3>
        {drivers.length > 0 ? (
          <div className="drivers-container">
            {drivers.map((driver) => (
              <span key={driver.id} className={`driver-tag ${driver.className}`}>
                {driver.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="no-drivers-text">Standard baseline demand drivers are active.</p>
        )}
      </div>

      <hr className="sidebar-divider" />

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
