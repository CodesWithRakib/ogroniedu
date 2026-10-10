import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  TutorVerificationStatusCard,
  QualificationSummaryItem,
} from '../src/components/tutor/TutorVerificationStatusCard';
import { getDictionary } from '../src/lib/i18n';

describe('TutorVerificationStatusCard Component Tests', () => {
  const mockQualifications: QualificationSummaryItem[] = [
    {
      id: 'qual-1',
      title: 'National ID (Smart Card)',
      qualificationType: 'nid',
      reviewStatus: 'approved',
    },
    {
      id: 'qual-2',
      title: 'B.Sc. in Electrical Engineering',
      institution: 'BUET',
      qualificationType: 'degree',
      reviewStatus: 'approved',
    },
    {
      id: 'qual-3',
      title: 'IELTS Academic Certificate',
      qualificationType: 'academic_certificate',
      reviewStatus: 'pending',
    },
  ];

  it('should instantiate TutorVerificationStatusCard in English with verified status', () => {
    const element = React.createElement(TutorVerificationStatusCard, {
      locale: 'en',
      verificationStatus: 'approved',
      publicationStatus: 'published',
      qualifications: mockQualifications,
    });

    expect(element).toBeDefined();
    expect(element.props.locale).toBe('en');
    expect(element.props.verificationStatus).toBe('approved');
    expect(element.props.publicationStatus).toBe('published');
    expect(element.props.qualifications).toHaveLength(3);
  });

  it('should instantiate TutorVerificationStatusCard in Bengali and verify dictionary keys', () => {
    const dict = getDictionary('bn');
    const element = React.createElement(TutorVerificationStatusCard, {
      locale: 'bn',
      verificationStatus: 'under_review',
      publicationStatus: 'draft',
      qualifications: mockQualifications,
    });

    expect(element).toBeDefined();
    expect(element.props.locale).toBe('bn');
    expect(dict.tutor.verificationStatusTitle).toBe('যাচাইকরণ অবস্থা');
    expect(dict.tutor.statusApproved).toBe('যাচাইকৃত ও অনুমোদিত');
    expect(dict.tutor.statusUnderReview).toBe('যাচাই করা হচ্ছে');
    expect(dict.tutor.badgeVerifiedIdentity).toBe('এনআইডি যাচাইকৃত');
    expect(dict.tutor.badgeVerifiedAcademic).toBe('সনদপত্র যাচাইকৃত');
  });

  it('should verify publication warning dictionary mapping in both languages', () => {
    const enDict = getDictionary('en');
    const bnDict = getDictionary('bn');

    expect(enDict.tutor.publicationWarning).toContain('approved by compliance reviewers');
    expect(bnDict.tutor.publicationWarning).toContain('সম্মতি দলের অনুমোদন আবশ্যক');
  });
});
