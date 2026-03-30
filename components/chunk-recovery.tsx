'use client';

import { useEffect } from 'react';

const RELOAD_ONCE_KEY = 'td-chunk-reload-once';

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

function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_ONCE_KEY) === '1') return;
    sessionStorage.setItem(RELOAD_ONCE_KEY, '1');
    window.location.reload();
  } catch {
    // no-op
  }
}

export function ChunkRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || '';
      if (isChunkLoadError(message)) reloadOnce();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message || '';
      if (isChunkLoadError(message)) reloadOnce();
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    const clearFlag = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_ONCE_KEY);
      } catch {
        // no-op
      }
    }, 10000);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.clearTimeout(clearFlag);
    };
  }, []);

  return null;
}

