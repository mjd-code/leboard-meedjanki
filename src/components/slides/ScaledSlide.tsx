import React, { useRef, useState, useEffect, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

// Fixed slide resolution - single source of truth
export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;
export const SLIDE_ASPECT_RATIO = SLIDE_WIDTH / SLIDE_HEIGHT;

// Context to share scale with child components (for WebGL/Canvas)
export const SlideScaleContext = createContext<number>(1);

export function useSlideScale() {
  return useContext(SlideScaleContext);
}

interface ScaledSlideProps {
  children?: React.ReactNode;
  SlideComponent?: React.ComponentType<any>;
  className?: string;
  containerClassName?: string;
  showGrid?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Universal slide scaling component.
 * 
 * Renders content at fixed 1920×1080 resolution and scales it to fit
 * the container while maintaining aspect ratio. Uses Math.min(scaleX, scaleY)
 * to ensure the slide always fits without overflow.
 * 
 * CRITICAL: The container sets explicit pixel dimensions based on the calculated
 * scale, NOT CSS aspect-ratio. This prevents overflow issues in flex containers.
 */
export function ScaledSlide({
  children,
  SlideComponent,
  className,
  containerClassName,
  showGrid = false,
  onClick,
}: ScaledSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.1);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      // Get the PARENT's available space, not our own dimensions
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      
      const availableWidth = parent.clientWidth;
      const availableHeight = parent.clientHeight;
      
      if (availableWidth === 0 || availableHeight === 0) return;
      
      // Calculate scale to fit BOTH dimensions (never overflow)
      const scaleX = availableWidth / SLIDE_WIDTH;
      const scaleY = availableHeight / SLIDE_HEIGHT;
      const fitScale = Math.min(scaleX, scaleY);
      
      // Calculate actual rendered dimensions
      const renderedWidth = SLIDE_WIDTH * fitScale;
      const renderedHeight = SLIDE_HEIGHT * fitScale;
      
      setScale(fitScale);
      setDimensions({ width: renderedWidth, height: renderedHeight });
    };

    // Use RAF to ensure layout is complete before measuring
    const rafId = requestAnimationFrame(updateScale);

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateScale);
    });
    
    // Observe the parent, not ourselves
    const parent = containerRef.current?.parentElement;
    if (parent) {
      observer.observe(parent);
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const content = SlideComponent ? <SlideComponent /> : children;

  return (
    <SlideScaleContext.Provider value={scale}>
      <div 
        ref={containerRef}
        className={cn(
          "relative overflow-hidden flex-shrink-0",
          containerClassName
        )}
        style={{ 
          width: dimensions.width || '100%',
          height: dimensions.height || 'auto',
        }}
      >
        <div 
          className={cn(
            "absolute top-0 left-0 rounded-lg shadow-xl overflow-hidden",
            showGrid && "grid-overlay",
            className
          )}
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          onClick={onClick}
        >
          {content}
        </div>
      </div>
    </SlideScaleContext.Provider>
  );
}

/**
 * Centered variant - centers the scaled slide in its container
 * Used in the main editor where slides float in the middle
 */
export function CenteredScaledSlide({
  children,
  SlideComponent,
  className,
  containerClassName,
  showGrid = false,
  onClick,
  zoom = 100,
}: ScaledSlideProps & { zoom?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [baseScale, setBaseScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      
      if (containerWidth === 0 || containerHeight === 0) return;
      
      const scaleX = containerWidth / SLIDE_WIDTH;
      const scaleY = containerHeight / SLIDE_HEIGHT;
      const fitScale = Math.min(scaleX, scaleY);
      
      setBaseScale(fitScale);
    };

    const rafId = requestAnimationFrame(updateScale);

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateScale);
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  const zoomMultiplier = zoom / 100;
  const finalScale = baseScale * zoomMultiplier;
  const content = SlideComponent ? <SlideComponent /> : children;

  return (
    <SlideScaleContext.Provider value={finalScale}>
      <div 
        ref={containerRef}
        className={cn(
          "flex items-center justify-center w-full h-full overflow-hidden",
          containerClassName
        )}
      >
        <div 
          className={cn(
            "slide-canvas relative shadow-2xl rounded-lg overflow-hidden flex-shrink-0 isolate",
            showGrid && "grid-overlay",
            className
          )}
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            transform: `scale(${finalScale})`,
            transformOrigin: 'center center',
          }}
          onClick={onClick}
        >
          <div className="absolute inset-0">
            {content}
          </div>
        </div>
      </div>
    </SlideScaleContext.Provider>
  );
}
