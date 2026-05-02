import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
import { FileSearch, BarChart3, CheckCircle, Send, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: FileSearch,
    step: '01',
    title: 'Discovery',
    description: 'Initial consultation to understand goals',
    duration: '1-2 weeks',
    deliverables: ['Risk Profile', 'Goal Assessment', 'Timeline Analysis'],
  },
  {
    icon: BarChart3,
    step: '02',
    title: 'Strategy',
    description: 'Custom portfolio design and allocation',
    duration: '2-3 weeks',
    deliverables: ['Asset Allocation', 'Investment Policy', 'Fee Structure'],
  },
  {
    icon: CheckCircle,
    step: '03',
    title: 'Review',
    description: 'Proposal review and refinement',
    duration: '1 week',
    deliverables: ['Final Proposal', 'Legal Documents', 'Compliance Check'],
  },
  {
    icon: Send,
    step: '04',
    title: 'Execution',
    description: 'Account setup and fund deployment',
    duration: '3-5 days',
    deliverables: ['Account Opening', 'Initial Trades', 'Confirmation'],
  },
];

export default function Slide11OrderingProcess() {
  return (
    <MSSlideLayout>
      <div className="flex flex-col h-full px-20 py-16">
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-3xl font-semibold text-ms-navy mb-2">
            Client Onboarding Process
          </h2>
          <p className="text-lg text-ms-navy-80 font-light">
            A structured approach to portfolio implementation
          </p>
        </div>
        
        {/* Process steps */}
        <div className="flex-1 flex items-center">
          <div className="w-full grid grid-cols-4 gap-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector arrow */}
                {index < steps.length - 1 && (
                  <div className="absolute top-8 -right-2 z-10">
                    <ArrowRight className="w-4 h-4 text-ms-blue" />
                  </div>
                )}
                
                <div className="bg-white border border-ms-blue-40 rounded-sm p-5 h-full flex flex-col">
                  {/* Step number and icon */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-light text-ms-blue">{step.step}</span>
                    <div className="w-10 h-10 rounded-full bg-ms-blue/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-ms-blue" />
                    </div>
                  </div>
                  
                  {/* Title and description */}
                  <h3 className="text-lg font-semibold text-ms-navy mb-1">{step.title}</h3>
                  <p className="text-xs text-ms-navy-80 mb-4">{step.description}</p>
                  
                  {/* Duration */}
                  <div className="bg-ms-blue-20/50 rounded px-2 py-1 mb-4 inline-block self-start">
                    <span className="text-xs font-medium text-ms-navy">{step.duration}</span>
                  </div>
                  
                  {/* Deliverables */}
                  <div className="mt-auto pt-3 border-t border-ms-blue-20">
                    <p className="text-xs text-ms-navy-80 mb-2">Deliverables:</p>
                    <ul className="space-y-1">
                      {step.deliverables.map((item, dIndex) => (
                        <li key={dIndex} className="text-xs text-ms-navy flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-ms-blue" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Total timeline */}
        <div className="mt-8 flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-ms-navy-80">Total Timeline:</span>
            <span className="font-semibold text-ms-navy">4-7 weeks</span>
          </div>
          <div className="w-px h-4 bg-ms-blue-40" />
          <div className="flex items-center gap-2">
            <span className="text-ms-navy-80">Minimum Investment:</span>
            <span className="font-semibold text-ms-navy">$250,000</span>
          </div>
        </div>
      </div>
    </MSSlideLayout>
  );
}
