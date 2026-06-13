import React from 'react';

interface HeroProps {
  isLoading: boolean;
  modelSource: string | undefined;
  onCustomise: () => void;
  onConfigureAI: () => void;
}

const Hero: React.FC<HeroProps> = ({ isLoading, modelSource, onCustomise, onConfigureAI }) => {
  const isAI = modelSource === 'ai-gemini';
  const isTrained = modelSource === 'trained-model';

  return (
    <div className="hero-copy">
      <p className="eyebrow">Ghost Kitchen Forecaster</p>
      <h1>Plan tomorrow&apos;s prep before the first order lands.</h1>
      <p className="hero-text">
        Compare historical demand with a scenario-driven prediction, then
        translate item volume into ingredient prep in one glance.
      </p>
      <div className="status-row">
        <span
          className={`status-pill ${
            isAI ? 'ai' : isTrained ? 'success' : 'muted'
          }`}
        >
          {isLoading
            ? 'Updating forecast…'
            : isAI
            ? '🤖 AI · Gemini'
            : modelSource ?? 'offline-baseline'}
        </span>
        <span className="status-pill subtle">No login required</span>
      </div>
      {/* Both action buttons sit here, above the chart section */}
      <div className="hero-action-row">
        <button className="customise-button" onClick={onCustomise}>
          🍳 Customise My Kitchen
        </button>
        <button className="customise-button configure-ai-btn" onClick={onConfigureAI}>
          ⚙️ Configure AI
        </button>
      </div>
    </div>
  );
};

export default Hero;
