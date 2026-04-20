import type { Metadata } from 'next';
import AuthPageShell from '@/components/auth-page-shell';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a Traderlogify account.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupPage() {
  return <AuthPageShell initialMode="signup" />;
}
