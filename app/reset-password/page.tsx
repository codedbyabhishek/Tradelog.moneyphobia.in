'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicPageLayout from '@/components/public-page-layout';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setValid(false);
        setChecking(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
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

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to reset password.');
      }

      setMessage('Password updated successfully. You can now sign in with your new password.');
      setValid(false);
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPageLayout title="Reset Password" description="Choose a new password for your Traderlogify account.">
      {checking ? <p>Checking your reset link...</p> : null}

      {!checking && !valid ? (
        <div className="space-y-4">
          <p>This reset link is invalid, missing, or has expired.</p>
          <Link className="text-primary underline underline-offset-4" href="/app">
            Back to login
          </Link>
        </div>
      ) : null}

      {!checking && valid ? (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">New password</label>
            <input
              type="password"
              minLength={8}
              required
              className="w-full rounded-lg border border-border bg-input px-3 py-2"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirm new password</label>
            <input
              type="password"
              minLength={8}
              required
              className="w-full rounded-lg border border-border bg-input px-3 py-2"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your new password"
            />
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
          >
            {loading ? 'Updating password...' : 'Reset password'}
          </button>
        </form>
      ) : null}
    </PublicPageLayout>
  );
}
