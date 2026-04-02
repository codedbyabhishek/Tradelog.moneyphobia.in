import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Privacy Policy',
  description: 'Read how Traderlogify handles account data, journal records, and deletion requests.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <PublicPageLayout title="Privacy Policy" description="Last updated: March 6, 2026">
      <p>We collect account and trading-journal information required to provide the service.</p>
      <p>We do not sell personal data.</p>
      <p>Data is processed for authentication, storage, and product functionality.</p>
      <p>You can request account/data deletion through the Delete Account / Data Request page.</p>
    </PublicPageLayout>
  );
}
