import PublicPageLayout from '@/components/public-page-layout';

export default function ContactPage() {
  return (
    <PublicPageLayout
      title="Contact Us"
      description="Need help or have a question? Reach us using the support details below."
    >
      <p>Email: support@tradingjournal.app</p>
      <p>Response time: usually within 24-48 business hours.</p>
      <p>Please include your account email and a short problem summary.</p>
    </PublicPageLayout>
  );
}
