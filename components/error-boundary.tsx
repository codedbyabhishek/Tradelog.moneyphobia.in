'use client';

import React, { ReactNode, ReactElement } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const CHUNK_RECOVERY_KEY = 'td-chunk-recovery-once';

function isChunkLoadError(input: unknown): boolean {
  const message = String(input || '').toLowerCase();
  return (
    message.includes('failed to load chunk') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('failed to load module script')
  );
}

async function recoverFromChunkError() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('trading-diary'))
          .map((key) => caches.delete(key))
      );
    }
  } catch {
    // no-op
  }

  const url = new URL(window.location.href);
  url.searchParams.set('v', String(Date.now()));
  window.location.replace(url.toString());
}

/**
 * Error Boundary Component
 * Catches and displays errors in React component trees
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[v0] Error Boundary caught:', error);
    console.error('[v0] Error Info:', errorInfo);

    if (typeof window !== 'undefined' && isChunkLoadError(error?.message)) {
      try {
        if (sessionStorage.getItem(CHUNK_RECOVERY_KEY) !== '1') {
          sessionStorage.setItem(CHUNK_RECOVERY_KEY, '1');
          void recoverFromChunkError();
          return;
        }
      } catch {
        void recoverFromChunkError();
        return;
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="max-w-md w-full bg-card border border-red-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {this.state.error?.message || 'An unexpected error occurred'}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
