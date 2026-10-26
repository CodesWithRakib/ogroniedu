import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SavedTutorCard } from '../src/features/tutors/pages/saved-tutors-page';
import type { SavedTutorItem } from '../src/store/services/tutors-api';

describe('SavedTutorCard & Saved Tutors Management (Option 3)', () => {
  it('renders unavailable tutor card when profile is null or deactivated', () => {
    const item: SavedTutorItem = {
      tutorId: 'tutor-deactivated-001',
      savedAt: '2026-10-25T12:00:00.000Z',
      profile: null,
    };

    const htmlBn = renderToStaticMarkup(
      React.createElement(SavedTutorCard, {
        item,
        locale: 'bn',
        role: 'student',
        isRemoving: false,
        onRemove: () => {},
      }),
    );

    expect(htmlBn).toContain('বর্তমানে অনুপুস্থিত');
    expect(htmlBn).toContain('শিক্ষক প্রোফাইলটি বর্তমানে উপলব্ধ নয়');
    expect(htmlBn).toContain('সংরক্ষিত থেকে সরান');
    expect(htmlBn).toContain('data-testid="saved-tutor-unavailable"');
    expect(htmlBn).toContain('data-testid="unsave-tutor-tutor-deactivated-001"');

    const htmlEn = renderToStaticMarkup(
      React.createElement(SavedTutorCard, {
        item,
        locale: 'en',
        role: 'student',
        isRemoving: false,
        onRemove: () => {},
      }),
    );

    expect(htmlEn).toContain('Currently Unavailable');
    expect(htmlEn).toContain('Remove');
  });

  it('renders rich active tutor card with high contrast details, verified badge, and CTAs', () => {
    const item: SavedTutorItem = {
      tutorId: '8a798958-9c24-4049-86e9-18985e871597',
      savedAt: '2026-10-25T14:00:00.000Z',
      profile: {
        id: '8a798958-9c24-4049-86e9-18985e871597',
        displayNameEn: 'Farhan Ahmed',
        displayNameBn: 'ফারহান আহমেদ',
        avatarUrl: null,
        headlineEn: 'Senior Mathematics & Physics Specialist',
        headlineBn: 'সিনিয়র গণিত ও পদার্থবিজ্ঞান বিশেষজ্ঞ',
        bioEn: '10+ years helping students ace HSC exams.',
        bioBn: '১০+ বছর ধরে শিক্ষার্থীদের এইচএসসি পরীক্ষায় সাফল্য অর্জনে সাহায্য করছি।',
        yearsExperience: 8,
        teachingModes: ['online', 'in_person'],
        hourlyRateMinor: '50000', // ৳500
        currency: 'BDT',
        responseTimeMinutes: 15,
        badges: ['verified_identity', 'verified_academic'],
        subjects: [
          {
            id: 'sub-1',
            subjectId: 'sub-id-1',
            subjectNameEn: 'Higher Mathematics',
            subjectNameBn: 'উচ্চতর গণিত',
          },
          {
            id: 'sub-2',
            subjectId: 'sub-id-2',
            subjectNameEn: 'Physics',
            subjectNameBn: 'পদার্থবিজ্ঞান',
          },
        ],
        serviceAreas: [
          {
            districtNameEn: 'Dhaka',
            districtNameBn: 'ঢাকা',
          },
        ],
        ratingAverage: 4.9,
        totalReviews: 28,
        completedSessions: 142,
        nextAvailableWeekday: 1,
      },
    };

    const htmlBn = renderToStaticMarkup(
      React.createElement(SavedTutorCard, {
        item,
        locale: 'bn',
        role: 'student',
        isRemoving: false,
        onRemove: () => {},
      }),
    );

    // Tutor info
    expect(htmlBn).toContain('ফারহান আহমেদ');
    expect(htmlBn).toContain('সিনিয়র গণিত ও পদার্থবিজ্ঞান বিশেষজ্ঞ');
    expect(htmlBn).toContain('যাচাইকৃত');
    expect(htmlBn).toContain('৪.৯');
    expect(htmlBn).toContain('২৮');
    expect(htmlBn).toContain('১৪২');
    expect(htmlBn).toContain('সেশন সম্পন্ন');

    // Subjects & teaching modes
    expect(htmlBn).toContain('উচ্চতর গণিত');
    expect(htmlBn).toContain('পদার্থবিজ্ঞান');
    expect(htmlBn).toContain('অনলাইন ক্লাস');
    expect(htmlBn).toContain('হোম টিউশন');
    expect(htmlBn).toContain('ঢাকা');
    expect(htmlBn).toContain('৮');
    expect(htmlBn).toContain('বছর অভিজ্ঞতা');

    // Pricing & CTAs
    expect(htmlBn).toContain('৫০০');
    expect(htmlBn).toContain('/ ঘণ্টা');
    expect(htmlBn).toContain('বুকিং অনুরোধ');
    expect(htmlBn).toContain('বার্তা');
    expect(htmlBn).toContain('/bn/tutors/8a798958-9c24-4049-86e9-18985e871597?book=1');
    expect(htmlBn).toContain(
      '/bn/dashboard/student/messages?tutorId=8a798958-9c24-4049-86e9-18985e871597',
    );
    expect(htmlBn).toContain('data-testid="saved-tutor-8a798958-9c24-4049-86e9-18985e871597"');
    expect(htmlBn).toContain('data-testid="unsave-tutor-8a798958-9c24-4049-86e9-18985e871597"');

    // Guardian role test: message link should point to guardian dashboard
    const htmlGuardian = renderToStaticMarkup(
      React.createElement(SavedTutorCard, {
        item,
        locale: 'bn',
        role: 'guardian',
        isRemoving: false,
        onRemove: () => {},
      }),
    );
    expect(htmlGuardian).toContain(
      '/bn/dashboard/guardian/messages?tutorId=8a798958-9c24-4049-86e9-18985e871597',
    );
  });
});
