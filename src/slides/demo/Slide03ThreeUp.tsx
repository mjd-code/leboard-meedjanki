import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
import { TrendingUp, Shield, Globe, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const pillars = [
  {
    icon: TrendingUp,
    title: 'Growth',
    description: 'Capitalize on emerging market opportunities and innovative sectors driving long-term value creation.',
    metrics: [
      { label: 'YoY Return', value: '+12.4%', positive: true },
      { label: 'Alpha Generated', value: '+3.2%', positive: true },
      { label: 'Positions', value: '847', positive: null },
    ]
  },
  {
    icon: Shield,
    title: 'Stability',
    description: 'Build resilient portfolios with diversified asset allocation and risk-adjusted strategies.',
    metrics: [
      { label: 'Sharpe Ratio', value: '0.82', positive: true },
      { label: 'Volatility', value: '8.4%', positive: false },
      { label: 'Beta', value: '0.76', positive: null },
    ]
  },
  {
    icon: Globe,
    title: 'Global Reach',
    description: 'Access opportunities across 40+ markets with our worldwide investment platform.',
    metrics: [
      { label: 'Markets', value: '42', positive: null },
      { label: 'Intl Exposure', value: '38%', positive: true },
      { label: 'EM Allocation', value: '12%', positive: true },
    ]
  }
];

export default function Slide03ThreeUp() {
  return (
    <MSSlideLayout>
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-3xl font-semibold text-ms-navy mb-2">
            Our Investment Approach
          </h2>
          <p className="text-lg text-ms-navy-80 font-light">
            Three pillars of sustainable wealth creation
          </p>
        </div>
        
        {/* Three columns */}
        <div className="flex-1 grid grid-cols-3 gap-8">
          {pillars.map((pillar, index) => (
            <div 
              key={index}
              className="flex flex-col p-6 bg-white rounded-sm border-t-4 border-ms-blue shadow-sm"
            >
              <pillar.icon className="w-10 h-10 text-ms-blue mb-4" strokeWidth={1.5} />
              
              <h3 className="text-xl font-semibold text-ms-navy mb-2">
                {pillar.title}
              </h3>
              
              <p className="text-sm text-ms-navy-80 font-light leading-relaxed mb-6">
                {pillar.description}
              </p>
              
              {/* Metrics */}
              <div className="mt-auto space-y-3 pt-4 border-t border-ms-blue-40">
                {pillar.metrics.map((metric, mIndex) => (
                  <div key={mIndex} className="flex items-center justify-between">
                    <span className="text-xs text-ms-navy-80">{metric.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-ms-navy">{metric.value}</span>
                      {metric.positive === true && <ArrowUpRight className="w-3 h-3 text-green-600" />}
                      {metric.positive === false && <ArrowDownRight className="w-3 h-3 text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MSSlideLayout>
  );
}
