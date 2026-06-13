import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartDataEntry {
  label: string;
  Burgers: number;
  Pizzas: number;
  Salads: number;
  isForecast?: boolean;
}

interface DemandChartProps {
  data: ChartDataEntry[];
}

const itemColors = {
  Burgers: '#60a5fa', // sleek blue
  Pizzas: '#f97316',  // vibrant orange
  Salads: '#14b8a6',  // teal
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const isForecast = payload[0].payload.isForecast;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-title">
          {payload[0].payload.label} {isForecast ? '(Forecast)' : '(Actual)'}
        </p>
        <hr className="tooltip-divider" />
        {payload.map((item: any) => (
          <div key={item.name} className="tooltip-item">
            <span className="tooltip-dot" style={{ backgroundColor: item.color }} />
            <span className="tooltip-label">{item.name}:</span>
            <strong className="tooltip-value">{item.value} units</strong>
          </div>
        ))}
        <div className="tooltip-total">
          <span>Total:</span>
          <strong>
            {payload.reduce((sum: number, item: any) => sum + item.value, 0)} units
          </strong>
        </div>
      </div>
    );
  }
  return null;
};

const DemandChart: React.FC<DemandChartProps> = ({ data }) => {
  return (
    <div className="chart-card">
      <div className="card-header">
        <h2>Continuous Prep & Demand Trend</h2>
        <p>7-day historical menu item breakdown vs. simulated tomorrow forecast.</p>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis 
            dataKey="label" 
            tick={{ fill: 'rgba(232, 239, 255, 0.6)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: 'rgba(232, 239, 255, 0.6)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36}
            iconType="circle"
            formatter={(value: string) => <span style={{ color: 'rgba(232, 239, 255, 0.8)' }}>{value}</span>}
          />
          
          <Bar dataKey="Burgers" stackId="a" fill={itemColors.Burgers}>
            {data.map((entry, index) => (
              <Cell 
                key={`burgers-cell-${index}`} 
                opacity={entry.isForecast ? 1.0 : 0.45}
                stroke={entry.isForecast ? '#ffffff' : 'none'}
                strokeWidth={entry.isForecast ? 1.5 : 0}
              />
            ))}
          </Bar>
          <Bar dataKey="Pizzas" stackId="a" fill={itemColors.Pizzas}>
            {data.map((entry, index) => (
              <Cell 
                key={`pizzas-cell-${index}`} 
                opacity={entry.isForecast ? 1.0 : 0.45}
                stroke={entry.isForecast ? '#ffffff' : 'none'}
                strokeWidth={entry.isForecast ? 1.5 : 0}
              />
            ))}
          </Bar>
          <Bar dataKey="Salads" stackId="a" fill={itemColors.Salads}>
            {data.map((entry, index) => (
              <Cell 
                key={`salads-cell-${index}`} 
                opacity={entry.isForecast ? 1.0 : 0.45}
                stroke={entry.isForecast ? '#ffffff' : 'none'}
                strokeWidth={entry.isForecast ? 1.5 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DemandChart;
