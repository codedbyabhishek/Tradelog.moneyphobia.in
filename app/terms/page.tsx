import type { Metadata } from 'next';
import PublicPageLayout from '@/components/public-page-layout';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Terms and Conditions',
  description: 'Review the terms and usage conditions for Traderlogify.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <PublicPageLayout title="Terms & Conditions" description="Last updated: April 9, 2026">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Using Traderlogify</h2>
        <p>
          By accessing or using Traderlogify, you agree to use the product lawfully, responsibly,
          and only for legitimate account and journaling purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for
          activity that happens under your account. You must provide accurate information when
          creating an account.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Acceptable Use</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Do not misuse the service, attempt unauthorized access, or interfere with normal operation.</li>
          <li>Do not upload harmful, illegal, or infringing content.</li>
          <li>Do not use the service to violate broker, exchange, platform, or legal obligations.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Financial Disclaimer</h2>
        <p>
          Traderlogify is a journaling and analytics tool. It does not provide investment, legal, tax,
          or financial advice. You remain fully responsible for your trading decisions, risk management,
          and regulatory compliance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Availability and Changes</h2>
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We may update,
          improve, suspend, or remove features at any time without guaranteeing uninterrupted uptime.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Billing</h2>
        <p>
          Paid features may require an active subscription. Pricing, billing cycles, and payment
          handling are presented at checkout or within the product. Failure to pay or failed renewal
          may result in loss of paid access.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Termination</h2>
        <p>
          We may suspend or terminate access if we reasonably believe an account violates these terms,
          creates security risk, or misuses the platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p>
          For questions about these terms, contact{' '}
          <a className="text-primary underline underline-offset-4" href="mailto:support@traderlogify.online">
            support@traderlogify.online
          </a>
          .
        </p>
      </section>
    </PublicPageLayout>
  );
}
