import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ogroni.edu.bd';
  const locales = ['bn', 'en'];
  const routes = [
    '',
    '/request-tutor',
    '/tuitions',
    '/how-it-works',
    '/pricing',
    '/safety',
    '/faq',
    '/contact',
    '/terms',
    '/privacy',
  ];

  const now = new Date();
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Core public static & indexable routes
  for (const route of routes) {
    for (const locale of locales) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: now,
        changeFrequency: route === '' || route === '/tuitions' ? 'daily' : 'monthly',
        priority: route === '' ? 1.0 : route === '/request-tutor' || route === '/tuitions' ? 0.9 : 0.7,
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
