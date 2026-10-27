import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import { ReviewModalForm, ReviewCard, type ReviewItem } from '../src/features/trust';

describe('Tutor Verified Reviews, Multi-Criteria Ratings & Rebuttal System', () => {
  const store = makeStore();
  const sampleReview: ReviewItem = {
    id: 'rev-001-uuid',
    bookingId: 'booking-001-uuid',
    rating: 5,
    punctualityRating: 5,
    teachingClarityRating: 4,
    subjectMasteryRating: 5,
    comment: 'স্যার খুবই আন্তরিক এবং জটিল গণিত খুব সহজভাবে বুঝিয়ে দেন।',
    commentBn: 'স্যার খুবই আন্তরিক এবং জটিল গণিত খুব সহজভাবে বুঝিয়ে দেন।',
    commentEn: 'Sir is exceptionally sincere and clarifies complex math with ease.',
    isVerifiedBooking: true,
    reviewerDisplayName: 'ফারহান আহমেদ',
    reviewerDisplayNameBn: 'ফারহান আহমেদ',
    reviewerDisplayNameEn: 'Farhan Ahmed',
    tutorResponse: 'ধন্যবাদ ফারহান! তোমার ফলাফল নিশ্চিত করতে আমরা আরও চেষ্টা চালিয়ে যাব।',
    tutorResponseBn: 'ধন্যবাদ ফারহান! তোমার ফলাফল নিশ্চিত করতে আমরা আরও চেষ্টা চালিয়ে যাব।',
    tutorResponseEn: 'Thank you Farhan! We will keep striving for your best academic results.',
    tutorRespondedAt: '2026-10-26T12:00:00Z',
    createdAt: '2026-10-25T10:00:00Z',
  };

  it('should render ReviewModalForm with multi-criteria rating dimensions and verified banner', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(ReviewModalForm, {
          bookingId: 'booking-001-uuid',
          tutorName: 'রাকিবুল হাসান',
          subjectName: 'উচ্চতর গণিত',
          locale: 'bn',
          onClose: () => {},
        }),
      ),
    );

    // Verify header and subject
    expect(html).toContain('শিক্ষকের মূল্যায়ন ও রিভিউ');
    expect(html).toContain('উচ্চতর গণিত');
    expect(html).toContain('রাকিবুল হাসান');

    // Verify 100% verified booking notice
    expect(html).toContain('১০০% যাচাইকৃত বুকিং রিভিউ');

    // Verify all 4 rating dimensions are present
    expect(html).toContain('সামগ্রিক সন্তুষ্টি');
    expect(html).toContain('সময়নিষ্ঠতা ও নিয়মানুবর্তিতা');
    expect(html).toContain('বোঝানোর স্পষ্টতা ও শিক্ষাদান কৌশল');
    expect(html).toContain('পাঠ্যবিষয়ে দক্ষতা ও প্রস্তুতি');

    // Verify textarea for constructive feedback
    expect(html).toContain('review-comment-textarea');
    expect(html).toContain('ন্যূনতম ১০ অক্ষর');
  });

  it('should render ReviewCard with verified booking badge and multi-criteria breakdown pills', () => {
    const html = renderToStaticMarkup(
      React.createElement(ReviewCard, {
        review: sampleReview,
        locale: 'bn',
      }),
    );

    // Verify student name and verified badge
    expect(html).toContain('ফারহান আহমেদ');
    expect(html).toContain('১০০% যাচাইকৃত বুকিং');
    expect(html).toContain('5.0');

    // Verify multi-criteria breakdown pills
    expect(html).toContain('সময়নিষ্ঠতা');
    expect(html).toContain('5/5');
    expect(html).toContain('পাঠদান স্পষ্টতা');
    expect(html).toContain('4/5');
    expect(html).toContain('বিষয় দক্ষতা');

    // Verify student written comment
    expect(html).toContain('স্যার খুবই আন্তরিক এবং জটিল গণিত খুব সহজভাবে বুঝিয়ে দেন।');

    // Verify tutor reply
    expect(html).toContain('শিক্ষকের উত্তর / প্রতিক্রিয়া');
    expect(html).toContain('ধন্যবাদ ফারহান! তোমার ফলাফল নিশ্চিত করতে আমরা আরও চেষ্টা চালিয়ে যাব।');
  });

  it('should render ReviewCard in English with appropriate localization', () => {
    const html = renderToStaticMarkup(
      React.createElement(ReviewCard, {
        review: sampleReview,
        locale: 'en',
      }),
    );

    expect(html).toContain('Farhan Ahmed');
    expect(html).toContain('Verified Booking');
    expect(html).toContain('Punctuality');
    expect(html).toContain('Clarity');
    expect(html).toContain('Mastery');
    expect(html).toContain('Sir is exceptionally sincere and clarifies complex math with ease.');
    expect(html).toContain('Tutor Reply');
    expect(html).toContain(
      'Thank you Farhan! We will keep striving for your best academic results.',
    );
  });

  it('should render tutor reply trigger when viewing as tutor and no rebuttal exists', () => {
    const reviewWithoutReply: ReviewItem = {
      ...sampleReview,
      id: 'rev-002-uuid',
      tutorResponse: null,
      tutorResponseBn: null,
      tutorResponseEn: null,
      tutorRespondedAt: null,
    };

    const html = renderToStaticMarkup(
      React.createElement(ReviewCard, {
        review: reviewWithoutReply,
        isCurrentTutor: true,
        locale: 'bn',
      }),
    );

    expect(html).toContain('open-reply-btn');
    expect(html).toContain('শিক্ষক হিসেবে উত্তর দিন');
  });

  it('should render active reply textarea when replying mode is active', () => {
    const reviewWithoutReply: ReviewItem = {
      ...sampleReview,
      id: 'rev-003-uuid',
      tutorResponse: null,
      tutorResponseBn: null,
      tutorResponseEn: null,
      tutorRespondedAt: null,
    };

    const html = renderToStaticMarkup(
      React.createElement(ReviewCard, {
        review: reviewWithoutReply,
        isCurrentTutor: true,
        replying: true,
        replyText: 'শিক্ষার্থীর প্রচেষ্টাকে সাধুবাদ জানাই।',
        locale: 'bn',
      }),
    );

    expect(html).toContain('tutor-reply-textarea');
    expect(html).toContain('submit-tutor-reply-btn');
    expect(html).toContain('উত্তর প্রকাশ করুন');
  });
});
