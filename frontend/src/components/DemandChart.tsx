import React, { useMemo } from 'react';
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
  isForecast?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface DemandChartProps {
  data: ChartDataEntry[];
}

const itemColors: Record<string, string> = {
  Burgers: '#60a5fa', // sleek blue
  Pizzas: '#f97316',  // vibrant orange
  Salads: '#14b8a6',  // teal
};

const fallbackColors = [
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#facc15', // yellow
  '#a3e635', // lime
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#10b981', // emerald
];

const getColorForIndex = (index: number) => {
  return fallbackColors[index % fallbackColors.length];
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
  const dataKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(k => k !== 'label' && k !== 'isForecast');
    return keys;
  }, [data]);

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
          
          {dataKeys.map((key, i) => (
            <Bar 
              key={key} 
              dataKey={key} 
              stackId="a" 
              fill={itemColors[key] || getColorForIndex(i)}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`${key}-cell-${index}`} 
                  opacity={entry.isForecast ? 1.0 : 0.45}
                  stroke={entry.isForecast ? '#ffffff' : 'none'}
                  strokeWidth={entry.isForecast ? 1.5 : 0}
                />
              ))}
            </Bar>
          ))}
          
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DemandChart;
