import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'App',
  description: 'Private trading journal workspace for logged-in users.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
