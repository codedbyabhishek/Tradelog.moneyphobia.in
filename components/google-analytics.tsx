'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getCookieConsent } from '@/lib/analytics';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const updateConsent = () => {
      setEnabled(getCookieConsent() === 'accepted');
    };

    updateConsent();
    window.addEventListener('td-cookie-consent-change', updateConsent as EventListener);
    return () => {
      window.removeEventListener('td-cookie-consent-change', updateConsent as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!window.gtag || !MEASUREMENT_ID || !enabled) return;

    const search = searchParams?.toString();
    const pagePath = search ? `${pathname}?${search}` : pathname;

    window.gtag('config', MEASUREMENT_ID, {
      page_path: pagePath,
    });
  }, [enabled, pathname, searchParams]);

  if (!MEASUREMENT_ID || !enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
