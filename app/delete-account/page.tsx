import PublicPageLayout from '@/components/public-page-layout';

export default function DeleteAccountPage() {
  return (
    <PublicPageLayout
      title="Delete Account / Data Request"
      description="Submit requests for account deletion or personal data removal."
    >
      <p>Email your request to: privacy@tradingjournal.app</p>
      <p>Include your account email and request type: delete account, delete data, or export data.</p>
      <p>For security, we may ask for identity verification before processing.</p>
    </PublicPageLayout>
  );
}
