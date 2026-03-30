import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://royalblue-parrot-186916.hostingersite.com';
  const now = new Date();

  return [
    '',
    '/about',
    '/contact',
    '/faq',
    '/privacy',
    '/terms',
    '/cookies',
    '/disclaimer',
    '/account',
    '/delete-account',
    '/support',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));
}
