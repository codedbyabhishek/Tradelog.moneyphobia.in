'use client';

const CONSENT_KEY = 'td-cookie-consent';

export type CookieConsentState = 'accepted' | 'declined' | 'unset';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function getCookieConsent(): CookieConsentState {
  if (typeof window === 'undefined') {
    return 'unset';
  }

  const value = window.localStorage.getItem(CONSENT_KEY);
  if (value === 'accepted' || value === 'declined') {
    return value;
  }

  return 'unset';
}

export function setCookieConsent(value: Exclude<CookieConsentState, 'unset'>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent('td-cookie-consent-change', { detail: value }));
}

export function hasAnalyticsConsent() {
  return getCookieConsent() === 'accepted';
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || !hasAnalyticsConsent() || !window.gtag) {
    return;
  }

  window.gtag('event', eventName, params);
}
