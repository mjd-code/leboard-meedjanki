import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
import { Check, X } from 'lucide-react';

const comparisonData = [
  { feature: 'Diversified Asset Allocation', traditional: true, msApproach: true },
  { feature: 'Active Risk Management', traditional: false, msApproach: true },
  { feature: 'ESG Integration', traditional: false, msApproach: true },
  { feature: 'Tax-Loss Harvesting', traditional: false, msApproach: true },
  { feature: 'Personalized Strategy', traditional: false, msApproach: true },
  { feature: 'Global Market Access', traditional: true, msApproach: true },
];

export default function Slide05Comparison() {
  return (
    <MSSlideLayout>
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-semibold text-ms-navy mb-3">
            The Morgan Stanley Advantage
          </h2>
          <p className="text-xl text-ms-navy-80 font-light">
            How our approach differs from traditional wealth management
          </p>
        </div>
        
        {/* Comparison Table */}
        <div className="flex-1 flex items-start">
          <div className="w-full grid grid-cols-3 gap-0 text-center">
            {/* Header row */}
            <div className="p-5 bg-transparent" />
            <div className="p-5 bg-muted rounded-t-sm">
              <span className="text-lg font-semibold text-ms-navy-80">Traditional</span>
            </div>
            <div className="p-5 bg-ms-navy rounded-t-sm">
              <span className="text-lg font-semibold text-white">Morgan Stanley</span>
            </div>
            
            {/* Data rows */}
            {comparisonData.map((row, index) => (
              <React.Fragment key={index}>
                <div className={`p-5 text-left border-b border-border ${index === comparisonData.length - 1 ? 'rounded-bl-sm' : ''}`}>
                  <span className="text-base text-ms-navy font-medium">{row.feature}</span>
                </div>
                <div className={`p-5 bg-muted border-b border-border/50`}>
                  {row.traditional ? (
                    <Check className="w-6 h-6 text-ms-jade mx-auto" strokeWidth={2.5} />
                  ) : (
                    <X className="w-6 h-6 text-muted-foreground/40 mx-auto" strokeWidth={2} />
                  )}
                </div>
                <div className={`p-5 bg-ms-navy border-b border-ms-navy-80/30 ${index === comparisonData.length - 1 ? 'rounded-br-sm' : ''}`}>
                  {row.msApproach ? (
                    <Check className="w-6 h-6 text-ms-jade mx-auto" strokeWidth={2.5} />
                  ) : (
                    <X className="w-6 h-6 text-white/40 mx-auto" strokeWidth={2} />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </MSSlideLayout>
  );
}
