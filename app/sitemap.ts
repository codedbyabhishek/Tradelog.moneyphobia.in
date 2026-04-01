import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
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
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/about' || path === '/contact' || path === '/faq' ? 0.8 : 0.6,
  }));
}
