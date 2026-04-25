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

async function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_ONCE_KEY) === '1') return;
    sessionStorage.setItem(RELOAD_ONCE_KEY, '1');

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

    const url = new URL(window.location.href);
    url.searchParams.set('v', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    // no-op
    window.location.reload();
  }
}

export function ChunkRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || '';
      if (isChunkLoadError(message)) {
        void reloadOnce();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message || '';
      if (isChunkLoadError(message)) {
        void reloadOnce();
      }
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
