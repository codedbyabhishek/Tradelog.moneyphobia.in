import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Privacy Policy',
  description: 'Read how Traderlogify handles account data, journal records, and deletion requests.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <PublicPageLayout title="Privacy Policy" description="Last updated: April 9, 2026">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Overview</h2>
        <p>
          Traderlogify collects the minimum account and journal data needed to let users create an
          account, sign in, save trading records, and use product features such as analytics,
          exports, broker sync, billing, and support.
        </p>
        <p>
          We do not sell personal data. We use account information only to operate, secure, and
          improve the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Information We Collect</h2>
        <p>We may collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Account details such as name, email address, and login method.</li>
          <li>Authentication and session data required to keep accounts secure.</li>
          <li>Trading journal content including trades, screenshots, notes, ideas, goals, and settings.</li>
          <li>Billing and subscription metadata when paid features are used.</li>
          <li>Broker sync configuration that you choose to store for supported integrations.</li>
          <li>Basic technical and diagnostic information used to troubleshoot reliability and abuse.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How We Use Information</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>To create and manage user accounts.</li>
          <li>To authenticate users, prevent abuse, and protect account security.</li>
          <li>To store and display trading journal records and related uploads.</li>
          <li>To enable app features such as analytics, exports, broker sync, and billing.</li>
          <li>To respond to support requests and maintain the product.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Google Sign-In</h2>
        <p>
          If you use Google Sign-In, we receive basic profile information from Google, such as your
          verified email address, name, and Google account identifier. This information is used only
          to authenticate your account and connect your login to Traderlogify.
        </p>
        <p>
          We do not request Gmail, Drive, Calendar, or other Google account data as part of basic
          sign-in unless a future feature clearly asks for additional permission.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Data Sharing</h2>
        <p>
          We may use third-party providers that help us operate the service, such as hosting,
          database, authentication, billing, analytics, or infrastructure services. These providers
          only receive access as needed to perform their role.
        </p>
        <p>We do not sell or rent user personal information.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Data Retention and Deletion</h2>
        <p>
          We keep account and journal data while your account remains active or as needed to provide
          the service and maintain security records. You can request account or data deletion through
          the Delete Account / Data Request page or by contacting support.
        </p>
        <p>Deletion requests may require reasonable verification to protect account owners.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          For privacy questions, support requests, or data deletion requests, contact{' '}
          <a className="text-primary underline underline-offset-4" href="mailto:support@traderlogify.online">
            support@traderlogify.online
          </a>
          .
        </p>
      </section>
    </PublicPageLayout>
  );
}
