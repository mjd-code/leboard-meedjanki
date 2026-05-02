import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FloatingMenu } from './FloatingMenu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SLIDE_WIDTH, SLIDE_HEIGHT, useSlideScale, SlideScaleContext } from './ScaledSlide';

// Re-export for backwards compatibility
export { useSlideScale } from './ScaledSlide';

interface SlideCanvasProps {
  children: React.ReactNode;
  showGrid?: boolean;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  currentSlide?: number;
  totalSlides?: number;
  onPrevSlide?: () => void;
  onNextSlide?: () => void;
  onStartPresentation?: () => void;
  onStartPresenterView?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const ZOOM_LEVELS = [50, 75, 100, 125, 150];
const HIDE_DELAY = 500; // 0.5 seconds

export function SlideCanvas({
  children,
  showGrid = false,
  zoom = 100,
  onZoomChange,
  className,
  onClick,
  currentSlide,
  totalSlides,
  onPrevSlide,
  onNextSlide,
  onStartPresentation,
  onStartPresenterView,
  isDarkMode = false,
  onToggleDarkMode,
}: SlideCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerScale, setContainerScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Shared visibility state for both controls
  const [showControls, setShowControls] = useState(false);
  const [isHoveringZoomPill, setIsHoveringZoomPill] = useState(false);
  const [isHoveringNavPill, setIsHoveringNavPill] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringAnyPillRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isHoveringAnyPillRef.current = isHoveringZoomPill || isHoveringNavPill;
  }, [isHoveringZoomPill, isHoveringNavPill]);

  // Clear any existing timeout
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Start the hide timeout
  const startHideTimeout = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      // Use ref to get current value, not stale closure
      if (!isHoveringAnyPillRef.current) {
        setShowControls(false);
      }
    }, HIDE_DELAY);
  }, [clearHideTimeout]);

  // Handle mouse movement in canvas
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    startHideTimeout();
  }, [startHideTimeout]);

  // Handle mouse leave from canvas
  const handleMouseLeave = useCallback(() => {
    if (!isHoveringAnyPillRef.current) {
      clearHideTimeout();
      setShowControls(false);
    }
  }, [clearHideTimeout]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => clearHideTimeout();
  }, [clearHideTimeout]);

  // Keep visible while hovering any pill, restart timeout when leaving
  useEffect(() => {
    if (isHoveringZoomPill || isHoveringNavPill) {
      clearHideTimeout();
      setShowControls(true);
    } else if (showControls) {
      // Only start timeout if controls are visible
      startHideTimeout();
    }
  }, [isHoveringZoomPill, isHoveringNavPill, clearHideTimeout, startHideTimeout, showControls]);

  // Show controls on slide change
  useEffect(() => {
    if (currentSlide !== undefined) {
      setShowControls(true);
      startHideTimeout();
    }
  }, [currentSlide, startHideTimeout]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      setContainerSize({ width: containerWidth, height: containerHeight });
      
      // Calculate scale to fit the slide in the container
      const scaleX = containerWidth / SLIDE_WIDTH;
      const scaleY = containerHeight / SLIDE_HEIGHT;
      const fitScale = Math.min(scaleX, scaleY);
      
      setContainerScale(fitScale);
    };

    updateScale();
    
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Apply zoom on top of fit scale
  const zoomMultiplier = zoom / 100;
  const finalScale = containerScale * zoomMultiplier;
  
  // Calculate if slide overflows container (needs scrolling)
  const scaledWidth = SLIDE_WIDTH * finalScale;
  const scaledHeight = SLIDE_HEIGHT * finalScale;
  const needsScroll = scaledWidth > containerSize.width || scaledHeight > containerSize.height;

  const showNavigation = currentSlide !== undefined && totalSlides !== undefined;

  return (
    <SlideScaleContext.Provider value={finalScale}>
      <div 
        className="relative flex flex-col h-full w-full bg-[hsl(var(--canvas-bg))]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Zoom controls - fixed position top right */}
        {onZoomChange && (
          <TooltipProvider>
            <div 
              className={cn(
                "absolute top-3 right-3 flex items-center gap-0.5 px-1.5 py-0.5 bg-card/90 backdrop-blur-sm border border-border rounded-full shadow-md z-20 transition-opacity duration-300 ease-in-out",
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onMouseEnter={() => setIsHoveringZoomPill(true)}
              onMouseLeave={() => setIsHoveringZoomPill(false)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIndex = ZOOM_LEVELS.indexOf(zoom);
                      if (currentIndex > 0) {
                        onZoomChange(ZOOM_LEVELS[currentIndex - 1]);
                      }
                    }}
                    disabled={zoom === ZOOM_LEVELS[0]}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>

              <span className="text-[10px] font-mono min-w-[28px] text-center text-muted-foreground">
                {zoom}%
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIndex = ZOOM_LEVELS.indexOf(zoom);
                      if (currentIndex < ZOOM_LEVELS.length - 1) {
                        onZoomChange(ZOOM_LEVELS[currentIndex + 1]);
                      }
                    }}
                    disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onZoomChange(100);
                    }}
                  >
                    <Maximize className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Zoom</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        {/* Scrollable slide area */}
        <div 
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-8 overflow-hidden"
        >
          {/* Slide */}
          <div
            className={cn(
              'slide-canvas relative shadow-2xl rounded-lg overflow-hidden flex-shrink-0 isolate',
              showGrid && 'grid-overlay',
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
            {/* Fixed 1920x1080 slide content - fully opaque background to prevent bleed-through */}
            <div className="absolute inset-0 bg-background">
              {children}
            </div>
          </div>
        </div>

        {/* Bottom navigation controls */}
        {showNavigation && (
          <>
            {/* Center - Navigation pill */}
            <div 
              className={cn(
                "absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 bg-card/90 backdrop-blur-sm border border-border rounded-full shadow-md z-20 transition-opacity duration-300 ease-in-out",
                showControls ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onMouseEnter={() => setIsHoveringNavPill(true)}
              onMouseLeave={() => setIsHoveringNavPill(false)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={onPrevSlide}
                disabled={currentSlide <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              
              <span className="text-xs font-medium text-muted-foreground min-w-[50px] text-center">
                {currentSlide} / {totalSlides}
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={onNextSlide}
                disabled={currentSlide >= totalSlides}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Right - Floating menu (absolute right) */}
            {onStartPresentation && onToggleDarkMode && (
              <div className="absolute bottom-3 right-3">
                <FloatingMenu
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={onToggleDarkMode}
                  onStartPresentation={onStartPresentation}
                  onStartPresenterView={onStartPresenterView}
                />
              </div>
            )}
          </>
        )}
      </div>
    </SlideScaleContext.Provider>
  );
}
