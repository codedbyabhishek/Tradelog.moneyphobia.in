'use client';

import { useEffect } from 'react';
import { initOfflineSync } from '@/lib/offline-sync';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const enablePwa = process.env.NEXT_PUBLIC_ENABLE_PWA === 'true';

    // Default behavior: keep PWA disabled to avoid stale-cache blank screens.
    if (!enablePwa) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            void registration.unregister();
          });
          if ('caches' in window) {
            void caches.keys().then((keys) => {
              keys.forEach((key) => {
                if (key.startsWith('trading-diary')) {
                  void caches.delete(key);
                }
              });
            });
          }
        })
        .catch((error) => {
          console.warn('[PWA] Failed to cleanup service worker/caches:', error);
        });
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });

    initOfflineSync().catch(err => {
      console.error('[PWA] Offline sync init failed:', err);
    });

    // Handle app install prompt
    let deferredPrompt: any;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // UI for "Install" button would be shown here
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      deferredPrompt = null;
    });
  }, []);

  return null;
}
