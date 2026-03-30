'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SiteFooter from '@/components/site-footer';

export default function AuthScreen() {
  const { login, signup, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signup(name, email, password);
      } else {
        await login(email, password);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background p-4 sm:p-8 overflow-y-auto overflow-x-hidden">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="border-border bg-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background pointer-events-none" />
          <CardHeader className="relative z-10 p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Trading Journal</p>
            <CardTitle className="text-3xl sm:text-4xl leading-tight mt-3">
              Build Consistency With Data, Not Guesswork
            </CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2 max-w-lg">
              Track every trade, analyze your edge, and improve your process with structured review.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 p-8 pt-0 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Journaling</p>
                <p className="text-lg font-semibold">Fast Entry</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Analytics</p>
                <p className="text-lg font-semibold">Deep Review</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 p-3">
                <p className="text-xs text-muted-foreground">Storage</p>
                <p className="text-lg font-semibold">Cloud + MySQL</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border-border bg-card self-center">
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'Welcome Back' : 'Create Your Account'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Login to continue your trading review workflow.'
                : 'Signup to store your journal securely on your hosted database.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={mode === 'login' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  clearError();
                  setMode('login');
                }}
              >
                Login
              </Button>
              <Button
                type="button"
                variant={mode === 'signup' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => {
                  clearError();
                  setMode('signup');
                }}
              >
                Sign Up
              </Button>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Name (optional)</label>
                  <input
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <SiteFooter />
    </div>
  );
}
