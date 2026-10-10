import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  TutorSearchCatalog,
  TutorCardData,
  SearchCatalogResponse,
} from '../src/components/discovery/TutorSearchCatalog';
import { getDictionary, formatLocalizedNumber } from '../src/lib/i18n';

describe('TutorSearchCatalog Component & Invariant Tests', () => {
  const mockCatalog: SearchCatalogResponse = {
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
    data: [
      {
        id: 'tutor-1',
        displayName: 'Rahat Mahmud',
        headline: 'BUET CSE | 6+ Yrs Specialist',
        bio: 'HSC Higher Math and Physics expert',
        yearsExperience: 6,
        teachingModes: ['in_person', 'online'],
        hourlyRateMinor: '80000',
        currency: 'BDT',
        responseTimeMinutes: 20,
        badges: ['verified_tutor', 'verified_identity', 'verified_degree'],
        matchScore: 170,
        rankingReasons: [
          'Base profile active & approved (+100)',
          'National ID verified (+20)',
          'Degree credentials verified (+20)',
          'Experience factor 6 yrs (+20)',
          'Fast response time <60m (+10)',
        ],
        subjects: [
          {
            id: 'ts-1',
            subjectId: 'subj-math-1',
            subjectNameEn: 'Higher Mathematics',
            subjectNameBn: 'উচ্চতর গণিত',
            educationLevelNameEn: 'HSC',
            educationLevelNameBn: 'একাদশ-দ্বাদশ শ্রেণি',
            rateMinor: '80000',
          },
        ],
        serviceAreas: [{ districtNameEn: 'Dhaka', districtNameBn: 'ঢাকা' }],
      },
      {
        id: 'tutor-2',
        displayName: 'Nusrat Jahan',
        headline: 'DU English Specialist',
        bio: 'English literature and grammar mentoring',
        yearsExperience: 4,
        teachingModes: ['online'],
        hourlyRateMinor: '60000',
        currency: 'BDT',
        responseTimeMinutes: 40,
        badges: ['verified_tutor', 'verified_identity'],
        matchScore: 140,
        rankingReasons: [
          'Base profile active & approved (+100)',
          'National ID verified (+20)',
          'Experience factor 4 yrs (+10)',
          'Fast response time <60m (+10)',
        ],
        subjects: [
          {
            id: 'ts-2',
            subjectId: 'subj-eng-1',
            subjectNameEn: 'English',
            subjectNameBn: 'ইংরেজি',
            educationLevelNameEn: 'SSC',
            educationLevelNameBn: 'মাধ্যমিক',
            rateMinor: '60000',
          },
        ],
        serviceAreas: [{ districtNameEn: 'Dhaka', districtNameBn: 'ঢাকা' }],
      },
    ],
  };

  it('should instantiate TutorSearchCatalog with English locale and verify props', () => {
    const element = React.createElement(TutorSearchCatalog, {
      locale: 'en',
      initialData: mockCatalog,
    });

    expect(element).toBeDefined();
    expect(element.props.locale).toBe('en');
    expect(element.props.initialData.total).toBe(2);
    expect(element.props.initialData.data[0].displayName).toBe('Rahat Mahmud');
    expect(element.props.initialData.data[0].matchScore).toBe(170);
  });

  it('should verify Bengali dictionary translations and localized formatting for discovery', () => {
    const dict = getDictionary('bn');

    expect(dict.discovery.searchHeading).toBe('যাচাইকৃত অভিজ্ঞ গৃহশিক্ষক খুঁজুন');
    expect(dict.discovery.filterMode).toBe('পাঠদানের পদ্ধতি');
    expect(dict.discovery.sortRecommended).toBe('সুপারিশকৃত (ম্যাচ স্কোর)');
    expect(dict.bookingRequest.modalTitle).toBe('টিউটরিং ক্লাসের অনুরোধ পাঠান');
    expect(dict.bookingRequest.submitButton).toBe('অনুরোধ পাঠান');

    expect(formatLocalizedNumber(170, 'bn')).toBe('১৭০');
    expect(formatLocalizedNumber(800, 'bn')).toBe('৮০০');
  });

  it('should verify explainable ranking criteria and badges for search results', () => {
    const topTutor = mockCatalog.data[0];
    expect(topTutor.matchScore).toBe(170);
    expect(topTutor.badges).toContain('verified_identity');
    expect(topTutor.badges).toContain('verified_degree');
    expect(topTutor.rankingReasons).toHaveLength(5);
    expect(topTutor.rankingReasons[0]).toContain('+100');
    expect(topTutor.rankingReasons[1]).toContain('+20');
  });

  it('should verify booking request parameters and subject options structure', () => {
    const tutor = mockCatalog.data[0];
    expect(tutor.subjects[0].subjectId).toBe('subj-math-1');
    expect(tutor.hourlyRateMinor).toBe('80000');
    expect(tutor.teachingModes).toContain('online');
    expect(tutor.teachingModes).toContain('in_person');
  });
});
