import Link from 'next/link';
import { ReactNode } from 'react';
import SiteFooter from '@/components/site-footer';

interface PublicPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function PublicPageLayout({ title, description, children }: PublicPageLayoutProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <Link href="/" className="text-sm underline underline-offset-4">
            Back to Home
          </Link>
        </div>
        {description ? <p className="mb-8 text-muted-foreground">{description}</p> : null}
        <div className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-7">{children}</div>
      </div>
      <SiteFooter />
    </main>
  );
}
