
import React from 'react';

interface HeroProps {
  isLoading: boolean;
  modelSource: string | undefined;
}

const Hero: React.FC<HeroProps> = ({ isLoading, modelSource }) => {
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
            modelSource === 'trained-model' ? 'success' : 'muted'
          }`}
        >
          {isLoading ? 'Updating forecast' : modelSource ?? 'offline-baseline'}
        </span>
        <span className="status-pill subtle">No login required</span>
      </div>
    </div>
  );
};

export default Hero;
