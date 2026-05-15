'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCookieConsent, setCookieConsent, trackEvent, type CookieConsentState } from '@/lib/analytics';

export default function CookieConsentBanner() {
  const [isReady, setIsReady] = useState(false);
  const [consent, setConsent] = useState<CookieConsentState>(() => getCookieConsent());

  useEffect(() => {
    setConsent(getCookieConsent());
    setIsReady(true);
  }, []);

  if (!isReady || consent !== 'unset') {
    return null;
  }

  const handleConsent = (nextValue: 'accepted' | 'declined') => {
    setCookieConsent(nextValue);
    setConsent(nextValue);

    if (nextValue === 'accepted') {
      trackEvent('cookie_consent_accepted', {
        location: 'banner',
      });
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 px-4 py-4 shadow-2xl backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-foreground">Cookie and analytics notice</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We use essential cookies for login and optional analytics cookies to understand signups,
            clicks, and conversions. Read our{' '}
            <Link href="/cookies" className="text-primary underline underline-offset-4">
              Cookie Policy
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => handleConsent('declined')}>
            Decline analytics
          </Button>
          <Button type="button" onClick={() => handleConsent('accepted')}>
            Accept analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
