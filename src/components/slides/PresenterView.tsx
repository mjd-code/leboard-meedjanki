import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Monitor, 
  MonitorOff,
  Play,
  Pause,
  RotateCcw,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePresenterSync } from '@/hooks/usePresenterSync';
import { usePresenterNotes } from '@/hooks/usePresenterNotes';
import { ScaledSlide } from './ScaledSlide';

interface SlideInfo {
  id: string;
  component: React.ComponentType<any>;
  isWIP?: boolean;
  description?: string;
}

interface PresenterViewProps {
  slides: SlideInfo[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onExit: () => void;
}

export function PresenterView({
  slides,
  activeIndex,
  onIndexChange,
  onExit,
}: PresenterViewProps) {
  const [audienceConnected, setAudienceConnected] = useState(false);
  const [audienceWindow, setAudienceWindow] = useState<Window | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  
  const currentSlideId = slides[activeIndex]?.id ?? null;
  const { note } = usePresenterNotes(currentSlideId);

  const { broadcastSlideChange } = usePresenterSync(
    undefined,
    () => setAudienceConnected(true),
    () => setAudienceConnected(false)
  );

  // Timer
  useEffect(() => {
    if (!isTimerRunning) return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Open audience window
  const openAudienceWindow = useCallback(() => {
    const width = 1280;
    const height = 720;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      '/audience',
      'SlideForge Audience',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
    
    if (popup) {
      setAudienceWindow(popup);
      const checkInterval = setInterval(() => {
        if (popup.closed) {
          setAudienceWindow(null);
          setAudienceConnected(false);
          clearInterval(checkInterval);
        }
      }, 1000);
    }
  }, []);

  // Close audience window
  const closeAudienceWindow = useCallback(() => {
    if (audienceWindow && !audienceWindow.closed) {
      audienceWindow.close();
    }
    setAudienceWindow(null);
    setAudienceConnected(false);
  }, [audienceWindow]);

  // Broadcast slide changes
  useEffect(() => {
    broadcastSlideChange(activeIndex);
  }, [activeIndex, broadcastSlideChange]);

  // Cleanup on exit
  useEffect(() => {
    return () => {
      if (audienceWindow && !audienceWindow.closed) {
        audienceWindow.close();
      }
    };
  }, [audienceWindow]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        onIndexChange(Math.min(slides.length - 1, activeIndex + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        onIndexChange(Math.max(0, activeIndex - 1));
      } else if (e.key === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, slides.length, onIndexChange, onExit]);

  const CurrentSlide = slides[activeIndex]?.component;
  const NextSlide = slides[activeIndex + 1]?.component;

  return (
    <div className="fixed inset-0 z-50 bg-slide-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-black border-b border-slide-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-semibold">Presenter View</h1>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            audienceConnected 
              ? "bg-slide-gray-700 text-white" 
              : "bg-slide-gray-800 text-slide-gray-500"
          )}>
            {audienceConnected ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                Connected
              </>
            ) : (
              <>
                <MonitorOff className="w-3.5 h-3.5" />
                No Audience
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="flex items-center gap-1.5 bg-slide-gray-800 rounded-lg px-3 py-1.5 border border-slide-gray-700">
            <span className="text-white font-mono text-sm tabular-nums">{formatTime(elapsedTime)}</span>
            <div className="w-px h-4 bg-slide-gray-600 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slide-gray-400 hover:text-white hover:bg-slide-gray-700"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slide-gray-400 hover:text-white hover:bg-slide-gray-700"
              onClick={() => setElapsedTime(0)}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          {/* Audience window control */}
          {!audienceWindow || audienceWindow.closed ? (
            <Button
              size="sm"
              onClick={openAudienceWindow}
              className="gap-2 bg-white hover:bg-slide-gray-100 text-black h-8 text-xs"
            >
              <Monitor className="w-3.5 h-3.5" />
              Open Audience
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={closeAudienceWindow}
              className="gap-2 bg-slide-gray-800 border-slide-gray-600 text-white hover:bg-slide-gray-700 h-8 text-xs"
            >
              <MonitorOff className="w-3.5 h-3.5" />
              Close
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="text-slide-gray-400 hover:text-white hover:bg-slide-gray-700 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0 p-4 gap-4">
        {/* Left: Current slide + controls */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Current slide */}
          <div className="flex-1 bg-slide-gray-800 rounded-xl relative flex items-center justify-center p-6 min-h-0 border border-slide-gray-700">
            {/* Slide badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
              <span className="bg-white text-black text-xs font-medium px-2.5 py-1 rounded-full">
                {activeIndex + 1} / {slides.length}
              </span>
            </div>
            
            {/* Slide container - use h-full to give ScaledSlide a measurable parent */}
            <div className="w-full h-full flex items-center justify-center">
              <ScaledSlide SlideComponent={CurrentSlide} />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => onIndexChange(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="bg-slide-gray-800 border-slide-gray-700 text-white hover:bg-slide-gray-700 disabled:opacity-40 h-9 px-4 gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              onClick={() => onIndexChange(Math.min(slides.length - 1, activeIndex + 1))}
              disabled={activeIndex === slides.length - 1}
              className="bg-white hover:bg-slide-gray-100 text-black disabled:opacity-40 h-9 px-4 gap-1.5"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right: Notes + Next slide */}
        <div className="w-72 flex flex-col gap-3 shrink-0">
          {/* Notes */}
          <div className="flex-1 bg-slide-gray-800 rounded-xl p-4 flex flex-col min-h-0 border border-slide-gray-700">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="w-6 h-6 rounded-md bg-slide-gray-700 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-medium text-white">Notes</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {note?.content ? (
                <p className="text-slide-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
              ) : (
                <p className="text-slide-gray-500 text-sm italic">
                  No notes for this slide
                </p>
              )}
            </div>
          </div>

          {/* Next slide preview */}
          <div className="bg-slide-gray-800 rounded-xl p-4 shrink-0 border border-slide-gray-700">
            <p className="text-xs font-medium text-slide-gray-400 mb-3">Up Next</p>
            {/* Fixed height container for the next slide preview */}
            <div className="h-36 flex items-center justify-center">
              {NextSlide ? (
                <ScaledSlide SlideComponent={NextSlide} />
              ) : (
                <div 
                  className="bg-slide-gray-700 rounded-lg flex items-center justify-center text-slide-gray-500 text-xs border border-slide-gray-600 w-full h-full"
                >
                  End of presentation
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
