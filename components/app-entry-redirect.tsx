'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { buildAppPath, isAppPage } from '@/lib/app-routes';

export default function AppEntryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    router.replace(isAppPage(hash) ? buildAppPath(hash) : buildAppPath('dashboard'));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Opening your journal...</p>
    </div>
  );
}
