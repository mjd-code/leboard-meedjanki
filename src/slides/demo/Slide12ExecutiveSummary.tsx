import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';

const bulletPoints = [
  {
    header: 'Time Efficiency',
    detail: 'Early data shows 35–40% reduction in time spent on repetitive documentation tasks.',
  },
  {
    header: 'Error Reduction',
    detail: 'AI-assisted workflows demonstrate lower error rates compared to manual processing.',
  },
  {
    header: 'Pilot Scale',
    detail: '18 users across two functional groups successfully completed the pilot program.',
  },
  {
    header: 'User Sentiment',
    detail: 'Feedback is positive, citing faster completion times and fewer manual steps.',
  },
  {
    header: 'Data Governance',
    detail: 'User data is anonymized and retained for up to 14 days with role-based access controls.',
  },
  {
    header: 'Rollout Readiness',
    detail: 'Metrics and learnings support expansion to additional teams in the next phase.',
  },
];

export default function Slide12ExecutiveSummary() {
  return (
    <MSSlideLayout variant="default">
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-semibold text-ms-navy mb-3">
            Executive Summary
          </h1>
          <p className="text-lg text-ms-navy-80 font-light">
            Measurable efficiency gains and readiness for broader rollout
          </p>
        </div>

        {/* Bullet Points - Balanced 2x3 Grid */}
        <div className="flex-1 grid grid-cols-2 gap-x-10 gap-y-6">
          {bulletPoints.map((point, index) => (
            <div 
              key={index} 
              className="p-6 bg-white rounded-lg border-l-4 border-ms-blue shadow-sm"
            >
              <h3 className="text-base font-semibold text-ms-navy mb-2">
                {point.header}
              </h3>
              <p className="text-sm text-ms-navy-80 font-light leading-relaxed">
                {point.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Confidentiality Footer */}
        <div className="mt-8 pt-4 border-t border-ms-blue-40">
          <p className="text-sm text-ms-navy-80 font-light tracking-wide">
            Confidential — Internal Use Only
          </p>
        </div>
      </div>
    </MSSlideLayout>
  );
}
