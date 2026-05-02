import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const data = [
  { year: '2020', value: 100 },
  { year: '2021', value: 118 },
  { year: '2022', value: 112 },
  { year: '2023', value: 135 },
  { year: '2024', value: 158 },
  { year: '2025E', value: 172 },
];

const metrics = [
  { label: 'Total Return', value: '+72%', period: '5Y Cumulative', trend: 'up' },
  { label: 'CAGR', value: '11.4%', period: 'Annualized', trend: 'up' },
  { label: 'Max Drawdown', value: '-8.2%', period: '2022', trend: 'down' },
  { label: 'Sharpe Ratio', value: '1.24', period: 'Risk-Adjusted', trend: 'neutral' },
];

export default function Slide02DataViz() {
  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'up': return <TrendingUp className="w-5 h-5 text-slide-success" />;
      case 'down': return <TrendingDown className="w-5 h-5 text-slide-error" />;
      default: return <Minus className="w-5 h-5 text-slide-accent" />;
    }
  };

  return (
    <MSSlideLayout>
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-6">
          <h2 className="type-h2 text-slide-gray-900 mb-2">
            Portfolio Performance
          </h2>
          <p className="type-body-lg text-slide-gray-600">
            Cumulative returns indexed to 100
          </p>
        </div>
        
        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <div key={index} className="slide-metric-card">
              <div className="flex items-center justify-between mb-1">
                <span className="type-body-sm text-slide-gray-600">{metric.label}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <p className="type-metric text-slide-gray-900">{metric.value}</p>
              <p className="type-body-sm text-slide-gray-600">{metric.period}</p>
            </div>
          ))}
        </div>
        
        {/* Chart */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
              <defs>
                <linearGradient id="msBlueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--slide-accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--slide-accent))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="year" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--slide-gray-900))', fontSize: 16 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--slide-gray-900))', fontSize: 16 }}
                domain={[80, 200]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--slide-primary))', 
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: 16
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--slide-accent))" 
                strokeWidth={3}
                fill="url(#msBlueGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Footer note */}
        <p className="type-body-sm text-slide-gray-500 mt-4">
          Source: Morgan Stanley Research. E = Estimate. Past performance is not indicative of future results.
        </p>
      </div>
    </MSSlideLayout>
  );
}
