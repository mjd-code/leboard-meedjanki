import React from 'react';
import { Presentation, Sparkles, MousePointer2 } from 'lucide-react';
import deckBg from '@/assets/deckdesign.png';

const features = [{
  icon: Sparkles,
  label: 'AI-Powered'
}, {
  icon: MousePointer2,
  label: 'Interactive'
}];

export default function Slide01Intro() {
  return (
    <div className="w-full h-full relative font-sans slide-content">
      {/* Background image */}
      <img src={deckBg} alt="" className="absolute inset-0 w-full h-full object-cover" />

      <div className="relative z-10 flex flex-col justify-center items-center h-full px-20 py-16 text-center">
        {/* Logo/Icon */}
        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8 border border-white/30">
          <Presentation className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        
        {/* Main title */}
        <h1 className="text-7xl font-bold tracking-tight text-white mb-4 drop-shadow-lg">
          Lovable<span className="text-white/90">Slides</span>
        </h1>
        
        <p className="text-2xl text-white/90 font-light max-w-2xl mb-12 drop-shadow-md">
          Build stunning, interactive presentations with the power of code
        </p>
        
        {/* Keyboard hint */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <p className="text-sm text-white/80 drop-shadow-md">
            Press <kbd className="px-2 py-1 rounded bg-white/20 backdrop-blur-sm text-white font-mono text-xs mx-1 border border-white/30">→</kbd> to continue
          </p>
        </div>
      </div>
      
      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40 z-10" />
    </div>
  );
}