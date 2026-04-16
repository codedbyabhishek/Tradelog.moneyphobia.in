import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSharedCardLookup } from '@/lib/server/shared-cards';
import { getSiteUrl } from '@/lib/seo';

interface PageParams {
  params: Promise<{ id: string }>;
}

async function loadShare(id: string) {
  return getSharedCardLookup(id);
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const share = await loadShare(id);

  if (share.status === 'missing') {
    return {
      title: 'Shared Card Not Found',
      robots: {
        index: false,
        follow: false,
      },
    };
  }
  if (share.status === 'expired') {
    return {
      title: 'Shared Card Expired',
      description: 'This Traderlogify shared card has expired and is no longer available.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/share/${share.record.shareId}`;
  const imageUrl = `${siteUrl}/api/shared-cards/${share.record.shareId}/image`;

  return {
    title: share.record.title,
    description: share.record.caption || share.record.summaryText || 'Traderlogify shared performance card',
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: share.record.title,
      description: share.record.caption || share.record.summaryText || 'Traderlogify shared performance card',
      url: pageUrl,
      siteName: 'Traderlogify',
      type: 'website',
      images: [
        {
          url: imageUrl,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: share.record.title,
      description: share.record.caption || share.record.summaryText || 'Traderlogify shared performance card',
      images: [imageUrl],
    },
  };
}

export default async function SharedCardPage({ params }: PageParams) {
  const { id } = await params;
  const share = await loadShare(id);

  if (share.status === 'missing') {
    notFound();
  }
  if (share.status === 'expired') {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-border bg-card p-8 text-center shadow-xl shadow-black/5">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Traderlogify Shared Card</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">This share link has expired</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Shared cards stay live for 24 hours and then expire automatically for privacy.
          </p>
          <p className="text-xs text-muted-foreground">
            This card expired at {new Date(share.record.expiresAt).toLocaleString()}.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/app">Open Traderlogify</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Visit Homepage</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const siteUrl = getSiteUrl();
  const imageUrl = `${siteUrl}/api/shared-cards/${share.record.shareId}/image`;

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">Traderlogify Shared Card</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{share.record.title}</h1>
          {share.record.caption ? (
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">{share.record.caption}</p>
          ) : null}
          {share.record.summaryText ? (
            <p className="mx-auto max-w-3xl whitespace-pre-line text-sm text-muted-foreground">
              {share.record.summaryText}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            This shared card expires automatically after 24 hours.
            {' '}
            Available until {new Date(share.record.expiresAt).toLocaleString()}.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/10">
          <div className="relative aspect-[16/10] w-full bg-secondary/20">
            <Image
              src={imageUrl}
              alt={share.record.title}
              fill
              unoptimized
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <a href={imageUrl} target="_blank" rel="noreferrer">
              Open Full Image
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app">Open Traderlogify</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
