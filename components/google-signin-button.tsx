'use client';

import { useEffect, useId, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  clientId: string;
  disabled?: boolean;
  onCredential: (credential: string) => void;
}

export default function GoogleSignInButton({
  clientId,
  disabled = false,
  onCredential,
}: GoogleSignInButtonProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  const scriptId = useId();

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || disabled) return;

    let cancelled = false;

    const initialize = () => {
      if (cancelled || !elementRef.current || !window.google?.accounts?.id) return;

      elementRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          if (response?.credential) {
            callbackRef.current(response.credential);
          }
        },
      });
      window.google.accounts.id.renderButton(elementRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 320,
        text: 'continue_with',
      });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gsi="true"]');
    if (existing) {
      if (window.google?.accounts?.id) {
        initialize();
      } else {
        existing.addEventListener('load', initialize, { once: true });
      }
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.id = scriptId;
    script.addEventListener('load', initialize, { once: true });
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, scriptId]);

  return <div ref={elementRef} className={disabled ? 'pointer-events-none opacity-60' : ''} />;
}
