import { describe, it, expect } from 'vitest';
import {
  localizedTutorFields,
  localizedTutorText,
} from '../src/features/tutor-discovery/utils/localized-tutor-text';
import { filterCatalog } from '../src/features/tutor-discovery/utils/catalog-filter';
import type { TutorCardData } from '../src/features/tutor-discovery/types/tutor-discovery.types';

const bilingual = {
  headline: 'BUET Physics Tutor',
  bio: 'Physics for Class 9-12.',
  headlineEn: 'BUET Physics Tutor',
  headlineBn: 'বুয়েট পদার্থবিজ্ঞান শিক্ষক',
  bioEn: 'Physics for Class 9-12.',
  bioBn: 'নবম-দ্বাদশ শ্রেণির পদার্থবিজ্ঞান।',
};

describe('bilingual tutor profile copy', () => {
  it('shows Bangla copy on the Bangla UI', () => {
    expect(localizedTutorFields('bn', bilingual)).toEqual({
      headline: 'বুয়েট পদার্থবিজ্ঞান শিক্ষক',
      bio: 'নবম-দ্বাদশ শ্রেণির পদার্থবিজ্ঞান।',
    });
  });

  it('shows English copy on the English UI even when Bangla exists', () => {
    expect(localizedTutorFields('en', bilingual)).toEqual({
      headline: 'BUET Physics Tutor',
      bio: 'Physics for Class 9-12.',
    });
  });

  it('falls back to English when Bangla copy is missing — never fabricates it', () => {
    expect(localizedTutorText('bn', 'English only headline', null, undefined)).toBe(
      'English only headline',
    );
    expect(localizedTutorText('bn', 'English only headline', null, 'Legacy')).toBe(
      'English only headline',
    );
  });

  it('uses legacy English fields when explicit language fields are absent', () => {
    expect(localizedTutorText('en', undefined, undefined, 'Legacy headline')).toBe(
      'Legacy headline',
    );
  });

  it('returns null when no copy exists in any language', () => {
    expect(localizedTutorText('bn', null, null, null)).toBeNull();
  });
});

describe('bilingual keyword search in the client catalog fallback', () => {
  const base: TutorCardData = {
    id: 'tutor-1',
    displayName: 'Rahat Mahmud',
    headline: 'Physics Tutor',
    bio: 'Physics for Class 9-12.',
    headlineEn: 'Physics Tutor',
    headlineBn: 'পদার্থবিজ্ঞান শিক্ষক',
    bioEn: 'Physics for Class 9-12.',
    bioBn: 'নবম-দ্বাদশ শ্রেণির পদার্থবিজ্ঞান।',
    yearsExperience: 4,
    teachingModes: ['online'],
    hourlyRateMinor: '50000',
    currency: 'BDT',
    responseTimeMinutes: 20,
    badges: [],
    matchScore: 100,
    rankingReasons: [],
    subjects: [],
  };

  const search = (query: string) =>
    filterCatalog(
      { data: [base], total: 1, page: 1, limit: 10, totalPages: 1 },
      { query, modeFilter: '', minPrice: '', maxPrice: '', sortBy: 'recommended' },
    );

  it('matches Bangla headline and biography text', () => {
    expect(search('পদার্থবিজ্ঞান').data).toHaveLength(1);
    expect(search('নবম-দ্বাদশ').data).toHaveLength(1);
  });

  it('still matches English copy', () => {
    expect(search('Physics').data).toHaveLength(1);
  });

  it('does not match unrelated text', () => {
    expect(search('chemistry').data).toHaveLength(0);
  });
});
