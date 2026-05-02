import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
import { CheckCircle2 } from 'lucide-react';

const services = [
  'Portfolio Management',
  'Retirement Planning',
  'Estate Planning',
  'Tax Strategy',
];

const capabilities = [
  'Equity Research',
  'Fixed Income',
  'Alternative Investments',
  'Real Assets',
];

export default function Slide09TwoColumn() {
  return (
    <MSSlideLayout>
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-ms-navy mb-2">
            Comprehensive Wealth Solutions
          </h2>
          <p className="text-lg text-ms-navy-80 font-light">
            Tailored services to meet your unique financial objectives
          </p>
        </div>

        {/* Two columns */}
        <div className="flex-1 grid grid-cols-2 gap-12">
          {/* Left column */}
          <div className="bg-white rounded-sm p-8 shadow-sm border border-ms-blue-40">
            <h3 className="text-xl font-semibold text-ms-navy mb-6 pb-4 border-b border-ms-blue-40">
              Advisory Services
            </h3>
            <ul className="space-y-4">
              {services.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-ms-blue flex-shrink-0" />
                  <span className="text-ms-navy">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right column */}
          <div className="bg-ms-navy rounded-sm p-8">
            <h3 className="text-xl font-semibold text-white mb-6 pb-4 border-b border-white/20">
              Investment Capabilities
            </h3>
            <ul className="space-y-4">
              {capabilities.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-ms-blue flex-shrink-0" />
                  <span className="text-white/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </MSSlideLayout>
  );
}
