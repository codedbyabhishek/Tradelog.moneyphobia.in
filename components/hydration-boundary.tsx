'use client';

import { useEffect, useState } from 'react';

/**
 * HydrationBoundary - Prevents rendering content until client is fully hydrated
 * This prevents hydration mismatches when using localStorage in context providers
 * @param children - Content to render after hydration
 */
export function HydrationBoundary({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render a lightweight shell during initial render so users never see a blank page
  // if hydration/chunks are delayed.
  if (!isClient) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
