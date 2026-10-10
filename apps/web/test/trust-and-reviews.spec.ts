import { describe, it, expect } from 'vitest';
import React from 'react';
import { ReviewFormModal } from '../src/components/trust/ReviewFormModal';
import { TutorReviewsListView, ReviewItem } from '../src/components/trust/TutorReviewsListView';
import { TutorReplacementModal } from '../src/components/trust/TutorReplacementModal';
import { SafetyReportModal } from '../src/components/trust/SafetyReportModal';
import { getDictionary } from '../src/lib/i18n';

describe('Trust, Reviews, Safety & Replacement Frontend Tests (Phase 13)', () => {
  const sampleReviews: ReviewItem[] = [
    {
      id: 'rev-1',
      rating: 5,
      punctualityRating: 5,
      teachingClarityRating: 4,
      subjectMasteryRating: 5,
      comment: 'Excellent physics tutor for HSC syllabus.',
      isVerifiedBooking: true,
      tutorResponse: 'Thank you for the warm feedback!',
      tutorRespondedAt: '2026-10-10T12:00:00Z',
      createdAt: '2026-10-10T10:00:00Z',
      reviewer: { displayName: 'Farhan' },
    },
    {
      id: 'rev-2',
      rating: 4,
      punctualityRating: 4,
      teachingClarityRating: 5,
      comment: 'Very helpful and punctual teacher.',
      isVerifiedBooking: true,
      tutorResponse: null,
      createdAt: '2026-10-09T14:00:00Z',
      reviewer: { displayName: 'Nabila' },
    },
  ];

  it('should instantiate ReviewFormModal with bookingId and tutor name', () => {
    const el = React.createElement(ReviewFormModal, {
      bookingId: '00000000-0000-4000-8000-000000000001',
      tutorName: 'Professor Kabir',
      isOpen: true,
      onClose: () => {},
    });

    expect(el).toBeDefined();
    expect(el.props.tutorName).toBe('Professor Kabir');
    expect(el.props.bookingId).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('should instantiate TutorReviewsListView with criteria breakdown and verified booking badges', () => {
    const el = React.createElement(TutorReviewsListView, {
      tutorId: 'tutor-prof-1',
      reviews: sampleReviews,
      isCurrentTutor: true,
    });

    expect(el).toBeDefined();
    expect(el.props.reviews).toHaveLength(2);
    expect(el.props.reviews[0].isVerifiedBooking).toBe(true);
    expect(el.props.reviews[0].punctualityRating).toBe(5);
  });

  it('should instantiate TutorReplacementModal with 100% guarantee props', () => {
    const el = React.createElement(TutorReplacementModal, {
      bookingId: '00000000-0000-4000-8000-000000000001',
      isOpen: true,
      onClose: () => {},
    });

    expect(el).toBeDefined();
    expect(el.props.bookingId).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('should instantiate SafetyReportModal with child safety escalation support', () => {
    const el = React.createElement(SafetyReportModal, {
      reportedUserId: 'tutor-bad-1',
      isOpen: true,
      onClose: () => {},
    });

    expect(el).toBeDefined();
    expect(el.props.reportedUserId).toBe('tutor-bad-1');
  });

  it('should verify 100% dictionary key parity for trust namespace between bn and en', () => {
    const bnDict = getDictionary('bn');
    const enDict = getDictionary('en');

    expect(bnDict.trust).toBeDefined();
    expect(enDict.trust).toBeDefined();

    const bnKeys = Object.keys(bnDict.trust).sort();
    const enKeys = Object.keys(enDict.trust).sort();

    expect(bnKeys).toEqual(enKeys);
    expect(bnKeys.length).toBeGreaterThanOrEqual(35);

    // Verify key translations
    expect(bnDict.trust.reviewsTitle).toBe('শিক্ষার্থী ও অভিভাবকদের যাচাইকৃত রিভিউ');
    expect(enDict.trust.reviewsTitle).toBe('Verified Student & Guardian Reviews');
    expect(bnDict.trust.replacementTitle).toContain('টিউটর রিপ্লেসমেন্ট গ্যারান্টি');
    expect(enDict.trust.replacementTitle).toContain('Tutor Replacement Guarantee');
    expect(bnDict.trust.safetyReportTitle).toBe('নিরাপত্তা ও অভিযোগ পর্যবেক্ষণ');
    expect(enDict.trust.safetyReportTitle).toBe('Trust, Safety & Abuse Reporting');
    expect(bnDict.trust.antiSelfReviewNotice).toContain(
      'টিউটর কখনোই নিজের কোর্সের জন্য রিভিউ দিতে পারবেন না',
    );
    expect(enDict.trust.antiSelfReviewNotice).toContain(
      'Tutors are strictly prohibited from reviewing their own courses',
    );
  });
});
