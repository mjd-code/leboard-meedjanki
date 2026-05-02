import React, { useState, useEffect } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toolbar } from '@/components/layout/Toolbar';
import { SlideCanvas } from '@/components/slides/SlideCanvas';
import { SlideOverviewGrid } from '@/components/slides/SlideOverviewGrid';
import { PresentationMode } from '@/components/slides/PresentationMode';
import { PresenterView } from '@/components/slides/PresenterView';
import { PresenterNotesPanel } from '@/components/slides/PresenterNotesPanel';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { showcaseSlides } from '@/slides/showcase';

interface SlideData {
  id: string;
  component: React.ComponentType<any>;
  name: string;
  isWIP: boolean;
  description?: string;
}

export default function Index() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isPresenterView, setIsPresenterView] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  
  // Derive slides from showcaseSlides with deterministic IDs (for presenter notes persistence)
  const slides = React.useMemo<SlideData[]>(() => 
    showcaseSlides.map((s) => ({
      id: `slide-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
      component: s.component,
      name: s.name,
      isWIP: false,
      description: undefined,
    })),
    []
  );

  // Get current slide ID for presenter notes
  const currentSlideId = slides[activeSlideIndex]?.id ?? null;

  // Toggle dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (isPresentationMode || isPresenterView) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSlideIndex(prev => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSlideIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'G' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowGrid(prev => !prev);
      } else if (e.key === 'N' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowNotes(prev => !prev);
      } else if (e.key === 'S' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      } else if (e.key === 'P' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsPresentationMode(true);
      } else if (e.key === 'V' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsPresenterView(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isPresentationMode, isPresenterView]);


  const ActiveSlideComponent = slides[activeSlideIndex]?.component || showcaseSlides[0].component;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <Toolbar
        showGrid={showGrid}
        onToggleGrid={() => {
          const newShowGrid = !showGrid;
          setShowGrid(newShowGrid);
          if (newShowGrid) setShowSidebar(false);
        }}
        showNotes={showNotes}
        onToggleNotes={() => setShowNotes(!showNotes)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onStartPresentation={() => setIsPresentationMode(true)}
        onStartPresenterView={() => setIsPresenterView(true)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - always rendered, clipped when hidden */}
        <div 
          className="flex-shrink-0 overflow-hidden z-50 h-full"
          style={{ 
            width: showSidebar ? sidebarWidth : 0,
            transition: isResizing ? 'none' : 'width 200ms ease-out',
          }}
        >
          <div className="h-full" style={{ width: sidebarWidth }}>
            <Sidebar
              slides={slides.map((slide) => ({
                id: slide.id,
                content: <slide.component />,
              }))}
              activeSlideIndex={activeSlideIndex}
              onSlideClick={setActiveSlideIndex}
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onResizeStart={() => setIsResizing(true)}
              onResizeEnd={() => setIsResizing(false)}
              onSnapClose={() => setShowSidebar(false)}
            />
          </div>
        </div>

        {/* Sidebar Toggle - morphed tab shape at sidebar edge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="absolute top-1.5 z-40 h-8 w-6 flex items-center justify-center bg-background border border-l-0 rounded-r-full shadow-sm hover:bg-muted"
                style={{ 
                  left: showSidebar ? sidebarWidth - 5 : -4,
                  transition: isResizing ? 'none' : 'left 200ms ease-out, background-color 150ms'
                }}
              >
                {showSidebar ? (
                  <ChevronsLeft className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronsRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'} (⇧S)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            <SlideCanvas
              showGrid={false}
              zoom={zoom}
              onZoomChange={setZoom}
              currentSlide={activeSlideIndex + 1}
              totalSlides={slides.length}
              onPrevSlide={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
              onNextSlide={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))}
            >
              <ActiveSlideComponent />
            </SlideCanvas>

            {/* Grid View Overlay */}
            {showGrid && (
              <SlideOverviewGrid
                slides={slides}
                activeSlideIndex={activeSlideIndex}
                onSlideClick={setActiveSlideIndex}
                onClose={() => setShowGrid(false)}
              />
            )}
          </div>

          {/* Presenter Notes Panel - Bottom */}
          {showNotes && (
            <PresenterNotesPanel
              slideId={currentSlideId}
              slideIndex={activeSlideIndex}
              onClose={() => setShowNotes(false)}
            />
          )}
        </div>
      </div>

      {/* Presentation Mode */}
      {isPresentationMode && (
        <PresentationMode
          slides={slides.map(slide => ({
            id: slide.id,
            component: slide.component,
            isWIP: slide.isWIP,
            description: slide.description,
          }))}
          activeIndex={activeSlideIndex}
          onIndexChange={setActiveSlideIndex}
          onExit={() => setIsPresentationMode(false)}
        />
      )}

      {/* Presenter View (dual-window mode) */}
      {isPresenterView && (
        <PresenterView
          slides={slides.map(slide => ({
            id: slide.id,
            component: slide.component,
            isWIP: slide.isWIP,
            description: slide.description,
          }))}
          activeIndex={activeSlideIndex}
          onIndexChange={setActiveSlideIndex}
          onExit={() => setIsPresenterView(false)}
        />
      )}
    </div>
  );
}
