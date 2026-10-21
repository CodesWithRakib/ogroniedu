import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { TutorsPage } from '@/features/tutor-discovery/pages/tutors-page';
import { LoadingSpinner } from '@/components/ui';
import { type Locale } from '@/lib/i18n';

interface TutorsRouteProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: TutorsRouteProps): Promise<Metadata> {
  const resolved = await params;
  const locale = resolved.locale === 'en' ? 'en' : 'bn';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ogroni.edu.bd';

  const title =
    locale === 'en'
      ? 'Find Verified Academic Tutors in Bangladesh | OgroniEdu'
      : 'বাংলাদেশে বিশ্বস্ত ও যাচাইকৃত শিক্ষক খুঁজুন | অগ্রণী এডু';

  const description =
    locale === 'en'
      ? 'Search verified BUET, DU, and Medical educators for Class 1-12, SSC, HSC, and university admission test preparation.'
      : '১ম-১২শ শ্রেণি, এসএসসি, এইচএসসি ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতির জন্য বুয়েট ও ঢাবির যাচাইকৃত গৃহশিক্ষক খুঁজুন।';

  const canonicalUrl = `${baseUrl}/${locale}/tutors`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        bn: `${baseUrl}/bn/tutors`,
        en: `${baseUrl}/en/tutors`,
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

export default async function TutorsRoute({ params }: TutorsRouteProps) {
  const resolved = await params;
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name:
      locale === 'en'
        ? 'Find Verified Academic Tutors in Bangladesh'
        : 'বাংলাদেশে বিশ্বস্ত ও যাচাইকৃত শিক্ষক তালিকা',
    url: `https://ogroni.edu.bd/${locale}/tutors`,
    description:
      locale === 'en'
        ? 'Verified tutor directory for Bangla Medium, English Version, and English Medium curricula.'
        : 'বাংলা মাধ্যম, ইংলিশ ভার্সন ও ইংলিশ মিডিয়ামের যাচাইকৃত শিক্ষক ডিরেক্টরি।',
    provider: {
      '@type': 'Organization',
      name: 'OgroniEdu (অগ্রণী এডু)',
      url: 'https://ogroni.edu.bd',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense
        fallback={
          <div className="py-10">
            <LoadingSpinner />
          </div>
        }
      >
        <TutorsPage locale={locale} />
      </Suspense>
    </>
  );
}
