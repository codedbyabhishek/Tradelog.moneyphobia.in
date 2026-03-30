import PublicPageLayout from '@/components/public-page-layout';

export default function SupportPage() {
  return (
    <PublicPageLayout title="Support / Help Center" description="Help articles and direct support channels.">
      <p>For login or signup issues, check environment variables and database connectivity first.</p>
      <p>For UI bugs, share screenshots and the exact page name/device.</p>
      <p>If needed, contact support at support@tradingjournal.app.</p>
    </PublicPageLayout>
  );
}
