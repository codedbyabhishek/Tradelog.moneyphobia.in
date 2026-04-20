'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicPageLayout from '@/components/public-page-layout';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setChecking(false);
        setValid(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        setValid(Boolean(res.ok && data?.ok));
      } catch {
        setValid(false);
      } finally {
        setChecking(false);
      }
    };

    void run();
  }, [token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to verify email.');
      }

      setMessage('Email verified successfully. You can now open the app.');
      setValid(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to verify email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicPageLayout title="Verify Email" description="Confirm your email address to finish setting up your account.">
      {checking ? <p>Checking your verification link...</p> : null}

      {!checking && !valid ? (
        <div className="space-y-4">
          <p>This verification link is invalid, missing, or has expired.</p>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <Link className="text-primary underline underline-offset-4" href="/login">
            Back to login
          </Link>
        </div>
      ) : null}

      {!checking && valid ? (
        <form className="space-y-4" onSubmit={onSubmit}>
          <p>Click below to verify your email address and unlock the app.</p>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
          >
            {submitting ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
      ) : null}
    </PublicPageLayout>
  );
}
