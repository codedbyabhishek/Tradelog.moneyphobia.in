import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Delete Account',
  description: 'Submit account deletion and personal data removal requests for Traderlogify.',
  path: '/delete-account',
});

export default function DeleteAccountPage() {
  return (
    <PublicPageLayout
      title="Delete Account / Data Request"
      description="Submit requests for account deletion or personal data removal."
    >
      <p>Email your request to: support@traderlogify.online</p>
      <p>Include your account email and request type: delete account, delete data, or export data.</p>
      <p>For security, we may ask for identity verification before processing.</p>
    </PublicPageLayout>
  );
}
