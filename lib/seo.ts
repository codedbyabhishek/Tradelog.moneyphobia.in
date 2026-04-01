import type { Metadata } from 'next';

const DEFAULT_SITE_URL = 'https://moneyphobiajournal.vercel.app';

export function getSiteUrl() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL;

  return value.replace(/\/$/, '');
}

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
      siteName: 'Moneyphobia Journal',
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
