import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Contact',
  description: 'Contact Traderlogify for account, product, and troubleshooting help.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <PublicPageLayout
      title="Contact Us"
      description="Need help or have a question? Reach us using the support details below."
    >
      <p>Email: hello@traderlogify.online</p>
      <p>Support: support@traderlogify.online</p>
      <p>Response time: usually within 24-48 business hours.</p>
      <p>Please include your account email and a short problem summary.</p>
    </PublicPageLayout>
  );
}
