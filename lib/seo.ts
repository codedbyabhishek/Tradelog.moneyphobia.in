import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/env';

export { getSiteUrl } from '@/lib/env';

export function createPublicMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Traderlogify',
      type: 'website',
      images: [
        {
          url: `${siteUrl}/icon.svg`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/icon.svg`],
    },
  };
}
