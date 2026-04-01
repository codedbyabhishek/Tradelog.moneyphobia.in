import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Terms and Conditions',
  description: 'Review the terms and usage conditions for Moneyphobia Journal.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <PublicPageLayout title="Terms & Conditions" description="Last updated: March 6, 2026">
      <p>By using this app, you agree to use it lawfully and responsibly.</p>
      <p>The app is provided &quot;as is&quot; without guaranteed uptime or trading outcomes.</p>
      <p>You are responsible for your own trading decisions and compliance obligations.</p>
    </PublicPageLayout>
  );
}
