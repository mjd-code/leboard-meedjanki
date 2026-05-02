import React, { useEffect, useCallback } from 'react';
import { ScaledSlide } from './ScaledSlide';

interface PresentationModeProps {
  slides: Array<{
    id: string;
    component: React.ComponentType<any>;
    isWIP?: boolean;
    description?: string;
  }>;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onExit: () => void;
}

export function PresentationMode({
  slides,
  activeIndex,
  onIndexChange,
  onExit,
}: PresentationModeProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          if (activeIndex < slides.length - 1) {
            onIndexChange(activeIndex + 1);
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (activeIndex > 0) {
            onIndexChange(activeIndex - 1);
          }
          break;
        case 'Escape':
        case 'p':
        case 'P':
          e.preventDefault();
          onExit();
          break;
        case 'Home':
          e.preventDefault();
          onIndexChange(0);
          break;
        case 'End':
          e.preventDefault();
          onIndexChange(slides.length - 1);
          break;
      }
    },
    [activeIndex, slides.length, onIndexChange, onExit]
  );

  // Request fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.log('Fullscreen not available:', err);
      }
    };
    enterFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Handle fullscreen exit via browser controls
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onExit();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onExit]);

  // Keyboard controls
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentSlide = slides[activeIndex];
  const SlideComponent = currentSlide?.component;

  if (!SlideComponent) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      {/* Slide container - fills the screen, ScaledSlide handles 16:9 scaling */}
      <div className="w-full h-full flex items-center justify-center">
        <ScaledSlide SlideComponent={SlideComponent} />
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-4 right-4 text-white/60 text-sm font-medium">
        {activeIndex + 1} / {slides.length}
      </div>

      {/* Navigation hints */}
      <div className="absolute bottom-4 left-4 text-white/40 text-xs">
        ← → to navigate • Esc or P to exit
      </div>
    </div>
  );
}
