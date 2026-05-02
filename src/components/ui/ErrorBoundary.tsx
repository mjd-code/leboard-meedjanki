"use client";

import React from 'react';

/**
 * Top-level error boundary. Catches render-time crashes that would otherwise
 * leave the user staring at a white blank screen, and offers a one-click
 * recovery that clears the service-worker cache + reloads.
 */
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to console so devs can still debug; the UI stays usable.
    console.error('App crashed:', error, info?.componentStack);
  }

  private hardReset = async () => {
    try {
      // Tell the SW to drop its caches before we reload.
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        reg?.active?.postMessage('clear-caches');
        // Give the SW a tick to react.
        await new Promise((r) => setTimeout(r, 150));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }
    // Bypass HTTP cache.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || 'Unknown error';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-soft p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-2xl font-black">
            !
          </div>
          <h1 className="text-xl font-black text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mb-6 break-words">{msg}</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={this.hardReset}
              className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary-700 transition-colors"
            >
              Clear cache & reload
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground font-bold hover:bg-base-300 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;