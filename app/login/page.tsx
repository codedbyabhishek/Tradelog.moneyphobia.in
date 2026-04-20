import type { Metadata } from 'next';
import AuthPageShell from '@/components/auth-page-shell';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in to your Traderlogify account.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <AuthPageShell initialMode="login" />;
}
