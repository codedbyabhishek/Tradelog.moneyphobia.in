import type { Metadata } from 'next';
import ResetPasswordClient from './reset-password-client';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your Traderlogify account password.',
  alternates: {
    canonical: null,
  },
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
