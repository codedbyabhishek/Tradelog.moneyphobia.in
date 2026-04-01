import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Disclaimer',
  description: 'Important educational-use and risk disclaimer for Moneyphobia Journal.',
  path: '/disclaimer',
});

export default function DisclaimerPage() {
  return (
    <PublicPageLayout title="Disclaimer" description="Last updated: March 6, 2026">
      <p>This app is for educational and journaling purposes only.</p>
      <p>No content in this app is financial, investment, legal, or tax advice.</p>
      <p>Trading involves risk, including possible loss of capital.</p>
    </PublicPageLayout>
  );
}
