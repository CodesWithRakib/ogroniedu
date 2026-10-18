import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  filterCatalog,
  TutorCard,
  type SearchCatalogResponse,
  type TutorCardData,
} from '../src/features/tutor-discovery';

function tutor(
  overrides: Partial<TutorCardData> & Pick<TutorCardData, 'id' | 'displayName'>,
): TutorCardData {
  return {
    headline: null,
    bio: null,
    yearsExperience: null,
    teachingModes: ['online'],
    hourlyRateMinor: null,
    currency: 'BDT',
    responseTimeMinutes: null,
    badges: [],
    matchScore: 100,
    rankingReasons: [],
    subjects: [],
    serviceAreas: [],
    distanceKm: null,
    ratingAverage: null,
    totalReviews: 0,
    nextAvailableWeekday: null,
    ...overrides,
  };
}

const CATALOG: SearchCatalogResponse = {
  total: 3,
  page: 1,
  limit: 10,
  totalPages: 1,
  data: [
    tutor({
      id: 't1',
      displayName: 'Rahat Mahmud',
      headline: 'BUET CSE',
      teachingModes: ['in_person', 'online'],
      hourlyRateMinor: '90000',
      yearsExperience: 6,
      matchScore: 170,
      subjects: [
        {
          id: 's1',
          subjectId: 'subj-math',
          subjectNameEn: 'Higher Mathematics',
          subjectNameBn: 'উচ্চতর গণিত',
        },
      ],
    }),
    tutor({
      id: 't2',
      displayName: 'Nusrat Jahan',
      teachingModes: ['online'],
      hourlyRateMinor: '50000',
      yearsExperience: 2,
      matchScore: 140,
      subjects: [
        { id: 's2', subjectId: 'subj-eng', subjectNameEn: 'English', subjectNameBn: 'ইংরেজি' },
      ],
    }),
    tutor({
      id: 't3',
      displayName: 'Tanvir Ahmed',
      teachingModes: ['in_person'],
      hourlyRateMinor: '120000',
      yearsExperience: 4,
      matchScore: 120,
      subjects: [
        {
          id: 's3',
          subjectId: 'subj-phy',
          subjectNameEn: 'Physics',
          subjectNameBn: 'পদার্থবিজ্ঞান',
        },
      ],
    }),
  ],
};

const baseInput = {
  query: '',
  modeFilter: '',
  minPrice: '',
  maxPrice: '',
  sortBy: 'recommended' as const,
};

describe('Tutor discovery — client filter/sort contract', () => {
  it('filters by subject text in English and Bengali', () => {
    expect(
      filterCatalog(CATALOG, { ...baseInput, query: 'mathematics' }).data.map((t) => t.id),
    ).toEqual(['t1']);
    expect(filterCatalog(CATALOG, { ...baseInput, query: 'ইংরেজি' }).data.map((t) => t.id)).toEqual(
      ['t2'],
    );
  });

  it('filters by teaching mode', () => {
    expect(
      filterCatalog(CATALOG, { ...baseInput, modeFilter: 'in_person' }).data.map((t) => t.id),
    ).toEqual(['t1', 't3']);
  });

  it('combines subject, mode, and fee filters', () => {
    const result = filterCatalog(CATALOG, {
      ...baseInput,
      query: 'r',
      modeFilter: 'in_person',
      minPrice: '850',
      maxPrice: '1000',
    });
    expect(result.data.map((t) => t.id)).toEqual(['t1']);
    expect(result.total).toBe(1);
  });

  it('sorts by fee and experience with stable ordering', () => {
    expect(
      filterCatalog(CATALOG, { ...baseInput, sortBy: 'price_asc' }).data.map((t) => t.id),
    ).toEqual(['t2', 't1', 't3']);
    expect(
      filterCatalog(CATALOG, { ...baseInput, sortBy: 'experience_desc' }).data.map((t) => t.id),
    ).toEqual(['t1', 't3', 't2']);
  });

  it('defaults to match-score ordering and returns a bounded page envelope', () => {
    const result = filterCatalog(CATALOG, baseInput);
    expect(result.data.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(1);
  });

  it('returns a genuine empty result set instead of fallback tutors', () => {
    const result = filterCatalog(CATALOG, { ...baseInput, query: 'astrophysics' });
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('Tutor discovery — result card truthfulness', () => {
  const noop = () => undefined;

  it('never renders a rating when no published reviews exist', () => {
    const html = renderToStaticMarkup(
      React.createElement(TutorCard, {
        tutor: tutor({ id: 't9', displayName: 'New Tutor' }),
        locale: 'en',
        onShowScore: noop,
        onRequestBooking: noop,
      }),
    );
    expect(html).toContain('New tutor — no reviews yet');
    expect(html).not.toContain('reviews)');
  });

  it('renders the real aggregate rating only when reviews exist', () => {
    const html = renderToStaticMarkup(
      React.createElement(TutorCard, {
        tutor: tutor({
          id: 't10',
          displayName: 'Rated Tutor',
          ratingAverage: 4.5,
          totalReviews: 12,
        }),
        locale: 'en',
        onShowScore: noop,
        onRequestBooking: noop,
      }),
    );
    expect(html).toContain('4.5');
    expect(html).toContain('12');
    expect(html).toContain('reviews');
  });

  it('shows a real distance when the API supplies one and omits it otherwise', () => {
    const withDistance = renderToStaticMarkup(
      React.createElement(TutorCard, {
        tutor: tutor({ id: 't11', displayName: 'Near Tutor', distanceKm: 2.4 }),
        locale: 'en',
        onShowScore: noop,
        onRequestBooking: noop,
      }),
    );
    expect(withDistance).toContain('2.4');
    expect(withDistance).toContain('km');

    const withoutDistance = renderToStaticMarkup(
      React.createElement(TutorCard, {
        tutor: tutor({ id: 't12', displayName: 'Remote Tutor' }),
        locale: 'en',
        onShowScore: noop,
        onRequestBooking: noop,
      }),
    );
    expect(withoutDistance).not.toContain('km');
  });

  it('only offers the save action to signed-in users', () => {
    const guest = renderToStaticMarkup(
      React.createElement(TutorCard, {
        tutor: tutor({ id: 't13', displayName: 'Guest View' }),
        locale: 'en',
        onShowScore: noop,
        onRequestBooking: noop,
      }),
    );
    expect(guest).not.toContain('save-tutor-btn-t13');

    const signedIn = renderToStaticMarkup(
      React.createElement(TutorCard, {
        tutor: tutor({ id: 't13', displayName: 'Member View' }),
        locale: 'en',
        canSave: true,
        onToggleSave: noop,
        onShowScore: noop,
        onRequestBooking: noop,
      }),
    );
    expect(signedIn).toContain('save-tutor-btn-t13');
  });

  it('does not render a fee when the tutor has no approved public rate', () => {
    const html = renderToStaticMarkup(
      React.createElement(TutorCard, {
        tutor: tutor({ id: 't14', displayName: 'No Fee' }),
        locale: 'en',
        onShowScore: noop,
        onRequestBooking: noop,
      }),
    );
    expect(html).not.toContain('BDT');
  });
});
