import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';

const milestones = [
  { year: 'Q1 2025', title: 'Portfolio Review', description: 'Annual rebalancing and strategy alignment' },
  { year: 'Q2 2025', title: 'Market Assessment', description: 'Mid-year economic outlook evaluation' },
  { year: 'Q3 2025', title: 'Opportunity Analysis', description: 'Emerging sector identification' },
  { year: 'Q4 2025', title: 'Year-End Planning', description: 'Tax optimization and forward guidance' },
];

export default function Slide04Timeline() {
  return (
    <MSSlideLayout>
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-ms-navy mb-2">
            2025 Strategic Roadmap
          </h2>
          <p className="text-lg text-ms-navy-80 font-light">
            Key milestones for portfolio management
          </p>
        </div>
        
        {/* Timeline */}
        <div className="flex-1 flex items-center">
          <div className="w-full relative">
            {/* Connecting line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-ms-blue-40" />
            
            {/* Milestones */}
            <div className="grid grid-cols-4 gap-4 relative">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  {/* Dot */}
                  <div className="w-12 h-12 rounded-full bg-ms-navy flex items-center justify-center text-white text-sm font-semibold mb-6 relative z-10">
                    {index + 1}
                  </div>
                  
                  {/* Content */}
                  <div className="bg-white p-6 rounded-sm shadow-sm border border-ms-blue-20 w-full">
                    <span className="text-xs font-semibold text-ms-blue uppercase tracking-wider">
                      {milestone.year}
                    </span>
                    <h3 className="text-lg font-semibold text-ms-navy mt-2 mb-2">
                      {milestone.title}
                    </h3>
                    <p className="text-sm text-ms-navy-80 font-light">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MSSlideLayout>
  );
}
