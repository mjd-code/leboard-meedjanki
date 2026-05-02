import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';

export default function Slide06Quote() {
  return (
    <MSSlideLayout variant="dark">
      <div className="flex flex-col justify-center items-center h-full px-20 py-16 text-center">
        {/* Quote mark */}
        <div className="text-8xl text-ms-blue font-serif leading-none mb-8">"</div>
        
        {/* Quote text */}
        <blockquote className="max-w-3xl">
          <p className="text-3xl font-light text-white leading-relaxed mb-8">
            We believe in building wealth that endures across generations, 
            guided by disciplined investment principles and a deep understanding 
            of our clients' aspirations.
          </p>
        </blockquote>
        
        {/* Attribution */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-0.5 bg-ms-blue mb-6" />
          <p className="text-lg font-semibold text-white">James P. Gorman</p>
          <p className="text-sm text-white/60 font-light">Executive Chairman, Morgan Stanley</p>
        </div>
      </div>
    </MSSlideLayout>
  );
}
