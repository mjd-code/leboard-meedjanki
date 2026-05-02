import React from 'react';
import { MSSlideLayout } from '@/components/slides/MSSlideLayout';

export default function Slide10Custom() {
  return (
    <MSSlideLayout variant="dark">
      <div className="flex flex-col justify-center items-center h-full px-20 py-16 text-center">
        {/* Thank you message */}
        <div className="max-w-3xl">
          <p className="text-ms-blue text-lg font-semibold uppercase tracking-widest mb-6">
            Thank You
          </p>
          
          <h2 className="text-5xl font-light text-white mb-8 leading-tight">
            Building Lasting
            <br />
            <span className="font-semibold">Partnerships</span>
          </h2>
          
          <div className="w-24 h-1 bg-ms-blue mx-auto mb-8" />
          
          <p className="text-xl text-white/70 font-light leading-relaxed">
            Morgan Stanley is dedicated to helping you achieve your financial 
            goals through personalized strategies and world-class expertise.
          </p>
        </div>
        
        {/* Disclaimer */}
        <div className="absolute bottom-8 left-20 right-20 text-center">
          <p className="text-xs text-white/40 leading-relaxed">
            Morgan Stanley Smith Barney LLC, Member SIPC. Investment products are not FDIC insured, 
            not bank guaranteed, and may lose value. © 2025 Morgan Stanley Smith Barney LLC.
          </p>
        </div>
      </div>
    </MSSlideLayout>
  );
}
