import PublicPageLayout from '@/components/public-page-layout';

export default function FaqPage() {
  return (
    <PublicPageLayout title="FAQ" description="Common questions about account, security, and data.">
      <div>
        <h2 className="text-lg font-semibold">Where is my data stored?</h2>
        <p className="text-muted-foreground">Your data is stored in your configured MySQL database.</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold">Can I export my data?</h2>
        <p className="text-muted-foreground">Yes, export options are available from data utilities.</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold">How do I reset my password?</h2>
        <p className="text-muted-foreground">Use account recovery from login support or contact support team.</p>
      </div>
    </PublicPageLayout>
  );
}
