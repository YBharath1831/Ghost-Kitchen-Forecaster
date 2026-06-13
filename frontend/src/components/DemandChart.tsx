
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DemandChartProps {
  data: {
    day: string;
    historical: number;
    forecast: number;
  }[];
}

const DemandChart: React.FC<DemandChartProps> = ({ data }) => {
  return (
    <div className="chart-card">
      <div className="card-header">
        <h2>Historical vs predicted demand</h2>
        <p>Line chart for prep planning and quick scenario comparison.</p>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
          <XAxis dataKey="day" tick={{ fill: 'rgba(232, 239, 255, 0.75)' }} />
          <YAxis tick={{ fill: 'rgba(232, 239, 255, 0.75)' }} />
          <Tooltip
            contentStyle={{
              background: 'rgba(13, 18, 36, 0.96)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              color: '#e8efff',
            }}
          />
          <Bar dataKey="historical" radius={[10, 10, 0, 0]} fill="#60a5fa" />
          <Bar dataKey="forecast" radius={[10, 10, 0, 0]} fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DemandChart;
