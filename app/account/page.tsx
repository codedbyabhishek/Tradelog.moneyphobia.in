import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Account Settings',
  description: 'Learn how to manage account preferences and account-related requests in Traderlogify.',
  path: '/account',
});

export default function AccountPage() {
  return (
    <PublicPageLayout title="Account Settings" description="Manage your account preferences and profile details.">
      <p>To update profile details, sign in and open in-app account settings.</p>
      <p>For security-related changes, contact support with account verification details.</p>
      <p>For deletion requests, use the dedicated Delete Account / Data Request page.</p>
    </PublicPageLayout>
  );
}
