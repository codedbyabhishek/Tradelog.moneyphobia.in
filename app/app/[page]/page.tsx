import { notFound } from 'next/navigation';
import JournalApp from '@/components/journal-app';
import { isAppPage } from '@/lib/app-routes';

type PageParams = {
  params: Promise<{ page: string }>;
};

export default async function AppWorkspacePage({ params }: PageParams) {
  const { page } = await params;

  if (!isAppPage(page)) {
    notFound();
  }

  return <JournalApp currentPage={page} />;
}
