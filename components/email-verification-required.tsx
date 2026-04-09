'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function EmailVerificationRequired() {
  const { user, refreshSession, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debugVerificationUrl, setDebugVerificationUrl] = useState<string | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setMessage(null);
    setDebugVerificationUrl(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to resend verification email.');
      }
      setMessage(data?.message || 'Verification email sent.');
      if (data?.debugVerificationUrl) {
        setDebugVerificationUrl(String(data.debugVerificationUrl));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Verify Your Email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent a verification link to <span className="font-medium text-foreground">{user?.email}</span>.
          Please verify your email before using the app.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          If you used a school, work, or filtered inbox, also check spam, promotions, or updates folders.
        </p>
        <div className="mt-5 space-y-3">
          <Button className="w-full" onClick={() => void handleResend()} disabled={loading}>
            {loading ? 'Sending...' : 'Resend verification email'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void refreshSession()}
          >
            I already verified my email
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => void logout()}>
            Logout
          </Button>
        </div>
        {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
        {debugVerificationUrl ? (
          <p className="mt-2 break-all text-xs text-muted-foreground">
            Debug link: <a className="text-primary underline underline-offset-4" href={debugVerificationUrl}>{debugVerificationUrl}</a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
