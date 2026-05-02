import React from 'react';

interface FloatingActionContainerProps {
  children: React.ReactNode;
}

export function FloatingActionContainer({ children }: FloatingActionContainerProps) {
  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 flex flex-col gap-3 items-end z-50 pointer-events-none">
      <div className="flex flex-col gap-3 *:pointer-events-auto">
        {children}
      </div>
    </div>
  );
}
