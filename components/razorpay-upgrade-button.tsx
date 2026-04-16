'use client';

import { useContext, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsContext } from '@/lib/settings-context';
import { trackEvent } from '@/lib/analytics';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (eventName: string, callback: (response: any) => void) => void;
    };
  }
}

interface RazorpayUpgradeButtonProps {
  billingCycle: 'monthly' | 'yearly';
  label: string;
  className?: string;
}

async function ensureRazorpayLoaded() {
  if (typeof window === 'undefined') return false;
  if (window.Razorpay) return true;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout.'));
    document.body.appendChild(script);
  });

  return Boolean(window.Razorpay);
}

export default function RazorpayUpgradeButton({
  billingCycle,
  label,
  className,
}: RazorpayUpgradeButtonProps) {
  const settings = useContext(SettingsContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setMessage(null);

    try {
      trackEvent('begin_checkout', {
        currency: 'INR',
        plan: 'pro',
        billing_cycle: billingCycle,
      });

      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingCycle }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to start subscription checkout.');
      }

      const loaded = await ensureRazorpayLoaded();
      if (!loaded || !window.Razorpay) {
        throw new Error('Razorpay checkout could not be loaded.');
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Traderlogify',
        description: billingCycle === 'yearly' ? 'Traderlogify Pro Yearly' : 'Traderlogify Pro Monthly',
        prefill: {
          name: data.customer?.name || '',
          email: data.customer?.email || '',
        },
        handler: async (response: {
          razorpay_payment_id?: string;
          razorpay_signature?: string;
          razorpay_subscription_id?: string;
        }) => {
          try {
            const confirmRes = await fetch('/api/billing/confirm', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });

            const confirmData = await confirmRes.json().catch(() => ({}));
            if (!confirmRes.ok) {
              throw new Error(confirmData?.error || 'Payment was authorised but confirmation failed.');
            }

            if (confirmData?.billing) {
              settings?.saveBillingState(confirmData.billing);
            }

            trackEvent('purchase', {
              currency: 'INR',
              transaction_id: response.razorpay_payment_id || response.razorpay_subscription_id || 'unknown',
              plan: 'pro',
              billing_cycle: billingCycle,
            });
            setMessage('Payment authorised and your Pro plan is now active.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Payment was authorised but confirmation failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setMessage((current) => current || 'Checkout closed before completing payment.');
          },
        },
        theme: {
          color: '#0f172a',
        },
      });

      razorpay.on('payment.failed', (response: any) => {
        const errorDescription = response?.error?.description || response?.error?.reason;
        trackEvent('purchase_failed', {
          plan: 'pro',
          billing_cycle: billingCycle,
          reason: errorDescription || 'unknown',
        });
        setMessage(errorDescription || 'Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to start payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" className={className} onClick={handleUpgrade} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? 'Opening checkout...' : label}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
