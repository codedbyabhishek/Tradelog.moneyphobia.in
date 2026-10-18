import type { Metadata } from 'next';
import VerifyEmailClient from './verify-email-client';

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your Traderlogify account email address.',
  alternates: {
    canonical: null,
  },
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
