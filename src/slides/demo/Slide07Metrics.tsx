import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
import { TrendingUp, DollarSign, BarChart3, PieChart } from 'lucide-react';

const metrics = [
  {
    icon: DollarSign,
    value: '$2.1T',
    label: 'Assets Under Management',
    change: '+8.2% YoY',
  },
  {
    icon: TrendingUp,
    value: '12.4%',
    label: 'Average Annual Return',
    change: '10-year avg',
  },
  {
    icon: BarChart3,
    value: '40+',
    label: 'Global Markets',
    change: 'Coverage',
  },
  {
    icon: PieChart,
    value: '15M+',
    label: 'Client Relationships',
    change: 'Worldwide',
  },
];

export default function Slide07Metrics() {
  return (
    <MSSlideLayout>
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-ms-navy mb-2">
            By the Numbers
          </h2>
          <p className="text-lg text-ms-navy-80 font-light">
            Our global scale and reach
          </p>
        </div>

        {/* Metrics grid */}
        <div className="flex-1 grid grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-ms-navy rounded-sm p-8 flex flex-col justify-between"
            >
              <metric.icon className="w-8 h-8 text-ms-blue mb-6" strokeWidth={1.5} />
              
              <div>
                <p className="text-4xl font-semibold text-white mb-2">
                  {metric.value}
                </p>
                <p className="text-sm text-white/70 font-light mb-1">
                  {metric.label}
                </p>
                <p className="text-xs text-ms-blue font-medium">
                  {metric.change}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <p className="text-xs text-ms-navy-80 mt-6">
          Data as of December 31, 2024. Source: Morgan Stanley Annual Report.
        </p>
      </div>
    </MSSlideLayout>
  );
}
