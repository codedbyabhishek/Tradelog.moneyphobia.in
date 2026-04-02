'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setMessage(null);

    try {
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
        handler: () => {
          setMessage('Payment authorised. Your Pro plan will fully activate after Razorpay webhook confirmation.');
        },
        theme: {
          color: '#0f172a',
        },
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
