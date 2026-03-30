import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { ErrorBoundary } from '@/components/error-boundary'
import { ChunkRecovery } from '@/components/chunk-recovery'
import { ServiceWorkerRegister } from '@/components/service-worker-register'
import { ThemeProvider } from '@/lib/theme-context'
import { HydrationBoundary } from '@/components/hydration-boundary'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Trading Journal',
  description: 'Professional trading journal app to track trades, analyze performance, and improve your trading strategy',
  generator: 'v0.app',
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
    title: 'Trading Diary',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="chunk-fallback" strategy="beforeInteractive">
          {`
            (function () {
              var KEY = 'td-early-chunk-reload-once';
              function shouldRecover(message) {
                if (!message) return false;
                var text = String(message).toLowerCase();
                return text.indexOf('failed to load chunk') !== -1 ||
                       text.indexOf('loading chunk') !== -1 ||
                       text.indexOf('chunkloaderror') !== -1 ||
                       text.indexOf('failed to fetch dynamically imported module') !== -1 ||
                       text.indexOf('failed to load module script') !== -1;
              }
              function recover() {
                try {
                  if (sessionStorage.getItem(KEY) === '1') return;
                  sessionStorage.setItem(KEY, '1');
                  location.reload();
                } catch (_) {}
              }
              window.addEventListener('error', function (event) {
                var message = (event && event.message) || (event && event.error && event.error.message) || '';
                if (shouldRecover(message)) recover();
              });
              window.addEventListener('unhandledrejection', function (event) {
                var reason = event && event.reason;
                var message = typeof reason === 'string' ? reason : (reason && reason.message) || '';
                if (shouldRecover(message)) recover();
              });
              setTimeout(function () {
                try { sessionStorage.removeItem(KEY); } catch (_) {}
              }, 10000);
            })();
          `}
        </Script>
      </head>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <HydrationBoundary>
          <ThemeProvider>
            <ErrorBoundary>
              <ChunkRecovery />
              <ServiceWorkerRegister />
              {children}
            </ErrorBoundary>
            <Analytics />
          </ThemeProvider>
        </HydrationBoundary>
      </body>
    </html>
  )
}
