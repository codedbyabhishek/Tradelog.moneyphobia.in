import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import PricingCards from '@/components/pricing-cards';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Pricing',
  description: 'Compare Free and Pro plans for Traderlogify trading journal features.',
  path: '/pricing',
});

export default function PricingPage() {
  return (
    <PublicPageLayout
      title="Pricing"
      description="Start with the Free plan and upgrade to Pro when you want broker sync, deeper analytics, and unlimited review tools."
    >
      <PricingCards />
    </PublicPageLayout>
  );
}
