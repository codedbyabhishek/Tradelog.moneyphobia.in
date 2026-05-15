import React, { Suspense } from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ErrorBoundary } from '@/components/error-boundary'
import { ChunkRecovery } from '@/components/chunk-recovery'
import GoogleAnalytics from '@/components/google-analytics'
import CookieConsentBanner from '@/components/cookie-consent-banner'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { ThemeProvider } from '@/lib/theme-context'
import { getSiteUrl } from '@/lib/seo'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Traderlogify',
    template: '%s | Traderlogify',
  },
  description: 'Trading journal for manual trade review, Dhan broker sync, setup tracking, screenshots, and performance analysis.',
  generator: 'v0.app',
  applicationName: 'Traderlogify',
  keywords: [
    'trading journal',
    'trade tracker',
    'Dhan sync',
    'broker sync',
    'trading analytics',
    'trading notes',
    'trade review',
    'emotion tagging for trades',
    'emotional state analysis',
    'review mindset trends',
  ],
  category: 'finance',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Traderlogify',
    description: 'Track trades, sync Dhan history, review setups, and build a disciplined trading journal.',
    url: '/',
    siteName: 'Traderlogify',
    type: 'website',
    images: [
      {
        url: '/icon.svg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Traderlogify',
    description: 'Track trades, sync Dhan history, review setups, and build a disciplined trading journal.',
    images: ['/icon.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Traderlogify',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090f' },
  ],
}

const swCleanupScript = `
  (function () {
    if (typeof window === 'undefined') return;

    function clearTraderlogifyCaches() {
      if (!('caches' in window)) return Promise.resolve();
      return caches.keys().then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) { return key.indexOf('trading-diary') === 0; })
            .map(function (key) { return caches.delete(key); })
        );
      });
    }

    function cleanupServiceWorkers() {
      if (!('serviceWorker' in navigator)) return Promise.resolve();
      return navigator.serviceWorker.getRegistrations().then(function (registrations) {
        return Promise.all(
          registrations.map(function (registration) {
            return registration.unregister();
          })
        );
      });
    }

    Promise.allSettled([
      clearTraderlogifyCaches(),
      cleanupServiceWorkers()
    ]).catch(function () {
      // no-op
    });
  })();
`;

const chunkFallbackScript = `
  (function () {
    var KEY = 'td-early-chunk-reload-once';
    function shouldRecover(message) {
      if (!message) return false;
      var text = String(message).toLowerCase();
      return text.indexOf('failed to load chunk') !== -1 ||
             text.indexOf('loading chunk') !== -1 ||
             text.indexOf('chunkloaderror') !== -1 ||
             text.indexOf('failed to fetch dynamically imported module') !== -1 ||
             text.indexOf('failed to load module script') !== -1 ||
             text.indexOf('stylesheet') !== -1 ||
             text.indexOf('css') !== -1;
    }
    function recover() {
      try {
        if (sessionStorage.getItem(KEY) === '1') return;
        sessionStorage.setItem(KEY, '1');
        Promise.allSettled([
          'serviceWorker' in navigator
            ? navigator.serviceWorker.getRegistrations().then(function (registrations) {
                return Promise.all(registrations.map(function (registration) {
                  return registration.unregister();
                }));
              })
            : Promise.resolve(),
          'caches' in window
            ? caches.keys().then(function (keys) {
                return Promise.all(
                  keys
                    .filter(function (key) { return key.indexOf('trading-diary') === 0; })
                    .map(function (key) { return caches.delete(key); })
                );
              })
            : Promise.resolve()
        ]).finally(function () {
          var url = new URL(location.href);
          url.searchParams.set('v', String(Date.now()));
          location.replace(url.toString());
        });
      } catch (_) {}
    }
    window.addEventListener('error', function (event) {
      var target = event && event.target;
      var resource = target && (target.src || target.href || target.tagName);
      var message = (event && event.message) || (event && event.error && event.error.message) || resource || '';
      if (shouldRecover(message)) recover();
    }, true);
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event && event.reason;
      var message = typeof reason === 'string' ? reason : (reason && reason.message) || '';
      if (shouldRecover(message)) recover();
    });
    setTimeout(function () {
      try { sessionStorage.removeItem(KEY); } catch (_) {}
    }, 10000);
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pwaEnabled = process.env.NEXT_PUBLIC_ENABLE_PWA === 'true'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {!pwaEnabled ? (
          <script id="sw-cleanup" dangerouslySetInnerHTML={{ __html: swCleanupScript }} />
        ) : null}
        <script id="chunk-fallback" dangerouslySetInnerHTML={{ __html: chunkFallbackScript }} />
      </head>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <ErrorBoundary>
            <ChunkRecovery />
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>
            <ServiceWorkerRegister />
            {children}
            <Toaster />
            <CookieConsentBanner />
          </ErrorBoundary>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
