'use client';

import React from 'react';

type Props = { children: React.ReactNode; label?: string };
type State = { hasError: boolean; message?: string };

/**
 * Block-scoped error boundary used inside BlogContent so a single malformed
 * Tiptap node (corrupt JSON in data-items, non-array nested content, etc.)
 * cannot crash the entire blog post page.
 */
export class BlockErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep visible in dev, silent in prod UI.
    // eslint-disable-next-line no-console
    console.error('[BlogContent] Block render failed:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <p className="not-prose my-4 text-sm text-red-500 italic border-l-2 border-red-500/50 pl-3">
          Error loading block{this.props.label ? ` (${this.props.label})` : ''}.
        </p>
      );
    }
    return this.props.children;
  }
}

export default BlockErrorBoundary;
