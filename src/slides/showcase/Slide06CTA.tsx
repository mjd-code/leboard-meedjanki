import React from 'react';
import { SlideLayout } from '@/components/slides/SlideLayout';
import { ArrowRight } from 'lucide-react';

export default function Slide06CTA() {
  return (
    <SlideLayout variant="default">
      <div className="flex flex-col justify-center items-center h-full px-20 py-16 text-center">
        {/* Main heading */}
        <h1 className="text-8xl font-bold tracking-tight text-slate-900 mb-6">
          Ready to build?
        </h1>
        
        <p className="text-2xl text-slate-500 font-light max-w-2xl mb-12">
          Use this template to get started
        </p>

        {/* CTA Button */}
        <button className="group flex items-center gap-3 px-8 py-4 bg-[#4E93FF] text-white rounded-full text-xl font-semibold shadow-lg hover:bg-[#3A7FE8] transition-all hover:shadow-xl">
          Get Started
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </SlideLayout>
  );
}
