import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ogroni.edu.bd';
  const locales = ['bn', 'en'];
  const routes = [
    '',
    '/tutors',
    '/how-it-works',
    '/pricing',
    '/safety',
    '/faq',
    '/contact',
    '/terms',
    '/privacy',
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    for (const locale of locales) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date('2026-10-10'),
        changeFrequency: route === '' || route === '/tutors' ? 'daily' : 'monthly',
        priority: route === '' ? 1.0 : route === '/tutors' ? 0.9 : 0.7,
        alternates: {
          languages: {
            bn: `${baseUrl}/bn${route}`,
            en: `${baseUrl}/en${route}`,
          },
        },
      });
    }
  }

  return sitemapEntries;
}
