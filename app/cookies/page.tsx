import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Cookie Policy',
  description: 'Understand how Traderlogify uses cookies for authentication and core app functionality.',
  path: '/cookies',
});

export default function CookiesPage() {
  return (
    <PublicPageLayout title="Cookie Policy" description="Last updated: March 6, 2026">
      <p>We use essential cookies for authentication and secure sessions.</p>
      <p>These cookies are required for login state and account protection.</p>
      <p>You may block cookies in your browser, but core app features may stop working.</p>
    </PublicPageLayout>
  );
}
