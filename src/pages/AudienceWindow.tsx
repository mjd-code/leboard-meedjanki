import React, { useEffect, useState } from 'react';
import { usePresenterSync } from '@/hooks/usePresenterSync';
import { showcaseSlides } from '@/slides/showcase';
import { ScaledSlide } from '@/components/slides/ScaledSlide';

interface SlideInfo {
  id: string;
  component: React.ComponentType<any>;
}

// This component is rendered in the popup window for the audience
export default function AudienceWindow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slides] = useState<SlideInfo[]>(() =>
    showcaseSlides.map((s, i) => ({
      id: `slide-${i}`,
      component: s.component,
    }))
  );

  const { sendPing, sendClose } = usePresenterSync(
    (index) => setCurrentIndex(index),
    undefined,
    undefined
  );

  // Ping presenter on mount to establish connection
  useEffect(() => {
    sendPing();
    
    // Send close message when window closes
    const handleBeforeUnload = () => {
      sendClose();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sendClose();
    };
  }, [sendPing, sendClose]);

  // Enter fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.log('Fullscreen not available:', err);
      }
    };
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(enterFullscreen, 100);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard navigation (for audience window too)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentSlide = slides[currentIndex];

  if (!currentSlide?.component) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <p className="text-white text-2xl">No slides available</p>
      </div>
    );
  }

  const SlideContent = currentSlide.component;

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      <ScaledSlide SlideComponent={SlideContent} />
    </div>
  );
}
