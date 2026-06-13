import React from 'react';
import type { ModelMetrics } from '../types';

interface ModelStatusProps {
  metrics: ModelMetrics | null;
}

const ModelStatus: React.FC<ModelStatusProps> = ({ metrics }) => {
  const isOnline = metrics?.source === 'trained-model';
  const maeData = metrics?.metrics;

  return (
    <div className="model-status-card">
      <div className="card-header">
        <div className="title-row">
          <h2>Forecast Engine Status</h2>
          <span className={`status-badge ${isOnline ? 'active' : 'fallback'}`}>
            {isOnline ? 'Trained Model Active' : 'Offline Baseline Active'}
          </span>
        </div>
        <p className="card-sub">AI prediction validation metrics from the latest ML training run.</p>
      </div>

      {maeData ? (
        <div className="metrics-grid">
          {Object.entries(maeData).map(([item, mae]) => {
            const maxMAE = 15;
            const accuracyScore = Math.max(50, Math.round(100 - (mae / maxMAE) * 50));
            
            return (
              <div key={item} className="metric-row">
                <div className="metric-info">
                  <span className="metric-name">{item}</span>
                  <span className="metric-val">MAE: {mae.toFixed(2)} units</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${accuracyScore}%` }}
                  />
                </div>
                <span className="accuracy-label">Model confidence: {accuracyScore}%</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="metrics-placeholder">
          <p>Validation metrics are unavailable in fallback mode. Start the backend API server to load the forecasting metrics.</p>
        </div>
      )}
    </div>
  );
};

export default ModelStatus;
