import Link from 'next/link';
import SiteFooter from '@/components/site-footer';

export default function Custom404Page() {
  return (
    <main className="min-h-screen bg-background">
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4">
        <div className="max-w-lg rounded-xl border border-border bg-card p-8 text-center">
          <p className="mb-2 text-sm uppercase tracking-widest text-muted-foreground">Error 404</p>
          <h1 className="mb-3 text-3xl font-bold">Page Not Found</h1>
          <p className="mb-6 text-muted-foreground">The page you are looking for does not exist or has moved.</p>
          <Link href="/" className="underline underline-offset-4">
            Go to Homepage
          </Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
