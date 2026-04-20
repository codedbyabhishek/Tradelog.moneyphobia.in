'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HydrationBoundary } from '@/components/hydration-boundary';
import AuthScreen from '@/components/auth-screen';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function AuthPageContent({ initialMode }: { initialMode: 'login' | 'signup' }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/app/dashboard');
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Opening your journal...</p>
      </div>
    );
  }

  return <AuthScreen initialMode={initialMode} />;
}

export default function AuthPageShell({ initialMode }: { initialMode: 'login' | 'signup' }) {
  return (
    <HydrationBoundary>
      <AuthProvider>
        <AuthPageContent initialMode={initialMode} />
      </AuthProvider>
    </HydrationBoundary>
  );
}
