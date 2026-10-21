import type { MetadataRoute } from 'next';

interface PublicTutorItem {
  id: string;
  updatedAt?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ogroni.edu.bd';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
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

  const now = new Date();
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Core public static & indexable routes
  for (const route of routes) {
    for (const locale of locales) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: now,
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

  // Fetch approved published tutors for dynamic indexing
  try {
    const res = await fetch(`${apiUrl}/api/v1/tutors?limit=100`, {
      next: { revalidate: 3600 },
      headers: { accept: 'application/json' },
    });
    if (res.ok) {
      const json = await res.json();
      const tutors: PublicTutorItem[] = json?.data?.data || json?.data || [];
      for (const tutor of tutors) {
        if (!tutor.id) continue;
        for (const locale of locales) {
          sitemapEntries.push({
            url: `${baseUrl}/${locale}/tutors/${tutor.id}`,
            lastModified: tutor.updatedAt ? new Date(tutor.updatedAt) : now,
            changeFrequency: 'weekly',
            priority: 0.8,
            alternates: {
              languages: {
                bn: `${baseUrl}/bn/tutors/${tutor.id}`,
                en: `${baseUrl}/en/tutors/${tutor.id}`,
              },
            },
          });
        }
      }
    }
  } catch {
    // If API is unreachable during static generation, return core routes gracefully
  }

  return sitemapEntries;
}
