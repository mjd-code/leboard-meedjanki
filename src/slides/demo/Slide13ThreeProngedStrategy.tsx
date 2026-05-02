import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';
import { Cpu, Lightbulb, Settings } from 'lucide-react';

const strategies = [
  {
    icon: Cpu,
    title: 'Employee AI Tools',
    points: [
      'Tool A for enhanced productivity within the Microsoft product suite as well as deep research offering through Researcher.',
      'Tool B for accessing internally developed common GenAI capabilities, with a consistent user experience & uniform implementation of controls.',
      'Large scale offering of Tool C for specific research needs.',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Business Unit (BU) Specific Solutions',
    points: [
      'Continued deployment of business-specific AI tools / applications.',
      'Leverage reusable patterns where applicable.',
    ],
  },
  {
    icon: Settings,
    title: 'Third-Party Applications & Platforms',
    points: [
      "Leverage Enterprise software providers' AI offerings to accelerate productivity within enterprise applications.",
      'Leverage innovative 3rd party vendors to provide novel business solutions.',
    ],
  },
];

export default function Slide13ThreeProngedStrategy() {
  return (
    <MSSlideLayout variant="default">
      <div className="flex flex-col h-full px-20 py-14">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-semibold text-ms-navy mb-2">
            Our Three-Pronged Strategy
          </h1>
          <p className="text-xl text-ms-navy-80 font-light">
            Pursuing Multiple Solution Deployment Models To Support Range Of Use Cases And Users
          </p>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className="flex-1 flex gap-8">
          {/* Left Panel - Vertical Accent */}
          <div className="w-48 flex-shrink-0">
            <div className="h-full bg-ms-blue rounded-xl flex items-center justify-center p-8">
              <p className="text-white text-xl font-semibold text-center leading-tight">
                Scaled GenAI<br />Deployment
              </p>
            </div>
          </div>

          {/* Right Panel - Three Strategy Cards */}
          <div className="flex-1 flex flex-col gap-5">
            {strategies.map((strategy, index) => (
              <div
                key={index}
                className="flex-1 bg-white rounded-lg px-8 py-6 flex items-start gap-6 shadow-sm border border-ms-blue-40"
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-lg bg-ms-blue/15 flex items-center justify-center flex-shrink-0">
                  <strategy.icon className="w-7 h-7 text-ms-blue" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-ms-navy mb-3">
                    {index + 1}. {strategy.title}
                  </h3>
                  <ul className="space-y-2">
                    {strategy.points.map((point, pointIndex) => (
                      <li
                        key={pointIndex}
                        className="flex items-start gap-3 text-base text-ms-navy-80 font-light leading-relaxed"
                      >
                        <span className="text-ms-blue mt-1 flex-shrink-0">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-ms-blue-40 flex items-center justify-between">
          <p className="text-base text-ms-navy-80 font-light tracking-wide">
            Confidential / Not For External Use – Do Not Forward
          </p>
          <p className="text-base text-ms-navy-80 font-light">1</p>
        </div>
      </div>
    </MSSlideLayout>
  );
}
