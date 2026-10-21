import type { Metadata } from 'next';
import { HomePage } from '@/features/public/pages/home-page';
import type { Locale } from '@/lib/i18n';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ogroni.edu.bd';

  const title =
    locale === 'en'
      ? 'OgroniEdu — Trusted Tutoring & Learning Platform in Bangladesh'
      : 'অগ্রণী এডু (OgroniEdu) — বিশ্বস্ত শিক্ষক ও শিক্ষার্থী প্ল্যাটফর্ম';

  const description =
    locale === 'en'
      ? 'Connect with verified tutors from BUET, DU, and Medical colleges. Guaranteed sessions, escrow payment protection, and modern learning management.'
      : 'বুয়েট, ঢাবি ও মেডিকেল কলেজের যাচাইকৃত শিক্ষকদের সাথে সরাসরি যোগাযোগ। গ্যারান্টিযুক্ত ক্লাস, নিরাপদ এসক্রো পেমেন্ট ও অগ্রগতি ট্র্যাকিং।';

  const canonicalUrl = `${baseUrl}/${locale}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        bn: `${baseUrl}/bn`,
        en: `${baseUrl}/en`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'OgroniEdu',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function HomeRoute({ params }: PageProps) {
  const resolvedParams = await params;
  const locale: Locale = resolvedParams.locale === 'en' ? 'en' : 'bn';

  const jsonLdWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OgroniEdu',
    url: 'https://ogroni.edu.bd',
    potentialAction: {
      '@type': 'SearchAction',
      target: `https://ogroni.edu.bd/${locale}/tutors?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const jsonLdOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OgroniEdu (অগ্রণী এডু)',
    url: 'https://ogroni.edu.bd',
    logo: 'https://ogroni.edu.bd/favicon.svg',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+8801711000000',
      contactType: 'customer service',
      areaServed: 'BD',
      availableLanguage: ['bn', 'en'],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <HomePage locale={locale} />
    </>
  );
}
