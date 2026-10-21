import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ogroni.edu.bd';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/*/dashboard',
          '/*/dashboard/*',
          '/*/admin',
          '/*/admin/*',
          '/*/analytics',
          '/*/payments',
          '/*/payments/*',
          '/*/learning',
          '/*/sessions',
          '/*/sessions/*',
          '/*/messages',
          '/*/notifications',
          '/*/safety-reports',
          '/*/assignments/*',
          '/*/classroom/*',
          '/*/onboarding',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
