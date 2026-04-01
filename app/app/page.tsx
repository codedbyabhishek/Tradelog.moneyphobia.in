import type { Metadata } from 'next';
import JournalApp from '@/components/journal-app';

export const metadata: Metadata = {
  title: 'App',
  description: 'Private trading journal workspace for logged-in users.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppPage() {
  return <JournalApp />;
}
