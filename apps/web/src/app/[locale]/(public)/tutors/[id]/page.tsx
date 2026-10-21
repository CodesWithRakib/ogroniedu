import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { TutorDetailsPage } from '@/features/tutors';
import { LoadingSpinner } from '@/components/ui';
import { type Locale } from '@/lib/i18n';

interface TutorDetailsRouteProps {
  params: Promise<{ locale: string; id: string }>;
}

interface PublicTutorProfileResponse {
  id: string;
  displayNameEn?: string;
  displayNameBn?: string;
  avatarUrl?: string | null;
  headlineEn?: string | null;
  headlineBn?: string | null;
  bioEn?: string | null;
  bioBn?: string | null;
  subjects?: Array<{
    subjectNameEn?: string;
    subjectNameBn?: string;
  }>;
}

async function fetchTutorPublicProfile(id: string): Promise<PublicTutorProfileResponse | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/v1/tutors/public/${id}`, {
      next: { revalidate: 3600 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: TutorDetailsRouteProps): Promise<Metadata> {
  const resolved = await params;
  const locale = resolved.locale === 'en' ? 'en' : 'bn';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ogroni.edu.bd';
  const tutor = await fetchTutorPublicProfile(resolved.id);

  if (!tutor) {
    return {
      title: locale === 'en' ? 'Tutor Profile' : 'শিক্ষক প্রোফাইল',
      robots: { index: false, follow: false },
    };
  }

  const name =
    locale === 'en'
      ? tutor.displayNameEn || tutor.displayNameBn || 'Verified Tutor'
      : tutor.displayNameBn || tutor.displayNameEn || 'যাচাইকৃত শিক্ষক';

  const headline =
    locale === 'en'
      ? tutor.headlineEn || tutor.headlineBn || 'Academic Tutor'
      : tutor.headlineBn || tutor.headlineEn || 'অভিজ্ঞ গৃহশিক্ষক';

  const bio =
    locale === 'en'
      ? tutor.bioEn || tutor.bioBn || 'Verified academic tutor on OgroniEdu Bangladesh.'
      : tutor.bioBn || tutor.bioEn || 'অগ্রণী এডুর যাচাইকৃত ও বিশ্বস্ত গৃহশিক্ষক।';

  const title = `${name} — ${headline} | OgroniEdu`;
  const description = bio.length > 155 ? `${bio.slice(0, 152)}...` : bio;
  const canonicalUrl = `${baseUrl}/${locale}/tutors/${resolved.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        bn: `${baseUrl}/bn/tutors/${resolved.id}`,
        en: `${baseUrl}/en/tutors/${resolved.id}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'OgroniEdu',
      type: 'profile',
      images: tutor.avatarUrl ? [{ url: tutor.avatarUrl, alt: name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: tutor.avatarUrl ? [tutor.avatarUrl] : undefined,
    },
  };
}

export default async function TutorDetailsRoute({ params }: TutorDetailsRouteProps) {
  const resolved = await params;
  const locale = (resolved.locale === 'en' ? 'en' : 'bn') as Locale;
  const tutorId = resolved.id;
  const tutor = await fetchTutorPublicProfile(tutorId);

  // Generate structured JSON-LD (schema.org/Person)
  const jsonLd = tutor
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: locale === 'en' ? tutor.displayNameEn : tutor.displayNameBn || tutor.displayNameEn,
        jobTitle: locale === 'en' ? tutor.headlineEn : tutor.headlineBn || tutor.headlineEn,
        description: locale === 'en' ? tutor.bioEn : tutor.bioBn || tutor.bioEn,
        image: tutor.avatarUrl || undefined,
        worksFor: {
          '@type': 'Organization',
          name: 'OgroniEdu (অগ্রণী এডু)',
          url: 'https://ogroni.edu.bd',
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Suspense
        fallback={
          <div className="py-20 flex justify-center items-center bg-brand-foreground">
            <LoadingSpinner />
          </div>
        }
      >
        <TutorDetailsPage tutorId={tutorId} locale={locale} />
      </Suspense>
    </>
  );
}
