import PublicPageLayout from '@/components/public-page-layout';

export default function CookiesPage() {
  return (
    <PublicPageLayout title="Cookie Policy" description="Last updated: March 6, 2026">
      <p>We use essential cookies for authentication and secure sessions.</p>
      <p>These cookies are required for login state and account protection.</p>
      <p>You may block cookies in your browser, but core app features may stop working.</p>
    </PublicPageLayout>
  );
}
