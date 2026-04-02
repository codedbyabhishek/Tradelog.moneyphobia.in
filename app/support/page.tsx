import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Support',
  description: 'Get help with login, database setup, UI issues, and product troubleshooting for Traderlogify.',
  path: '/support',
});

export default function SupportPage() {
  return (
    <PublicPageLayout title="Support / Help Center" description="Help articles and direct support channels.">
      <p>For login or signup issues, check environment variables and database connectivity first.</p>
      <p>For UI bugs, share screenshots and the exact page name/device.</p>
      <p>If needed, contact support at support@traderlogify.online.</p>
    </PublicPageLayout>
  );
}
