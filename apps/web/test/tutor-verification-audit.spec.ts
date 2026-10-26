import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { NextIntlClientProvider } from 'next-intl';
import { makeStore } from '../src/store';
import bnMessages from '../messages/bn.json';
import { VerificationLevelCard } from '../src/features/tutors/components/verificationLevelCard';
import { VerificationQueueTable } from '../src/features/admin/components/tabs/adminVerificationTab';
import type { VerificationLevelView } from '../src/store/services/tutors-api';
import type { VerificationQueueRow } from '../src/store/services/admin-api';

function renderWithProviders(node: React.ReactElement): string {
  return renderToStaticMarkup(
    React.createElement(Provider, {
      store: makeStore(),
      children: React.createElement(NextIntlClientProvider, {
        locale: 'bn',
        messages: bnMessages,
        children: node,
      }),
    }),
  );
}

describe('Tutor 3-Tier Verification Dossier & Compliance Audit Suite', () => {
  const store = makeStore();

  it('renders Tier 1 Identity Verification level with required NID checklist and high contrast styling', () => {
    const identityLevel: VerificationLevelView = {
      id: 'lvl-identity-001',
      level: 'identity',
      status: 'not_started',
      assignedReviewerUserId: null,
      decisionReasonCode: null,
      applicantFeedback: null,
      expiresAt: null,
      decidedAt: null,
      lastSubmittedAt: null,
      submissionCount: 0,
      policyVersion: 'v1.0-bd-tutor-verification',
      version: 1,
      requirements: {
        level: 'identity',
        requiredDocumentTypes: ['nid_front', 'nid_back'],
        anyOfDocumentTypes: [],
        missingRequiredDocumentTypes: ['nid_front', 'nid_back'],
        anyOfSatisfied: true,
        complete: false,
        missingUploadDocumentTypes: ['nid_front', 'nid_back'],
        submitReady: false,
        nextAction: 'upload_documents',
      },
      documents: [],
    };

    const html = renderWithProviders(
      React.createElement(VerificationLevelCard, {
        record: identityLevel,
        locale: 'bn',
        onChanged: () => {},
      }),
    );

    // Level Header and Status
    expect(html).toContain('পরিচয় যাচাইকরণ');
    expect(html).toContain('শুরু হয়নি');
    expect(html).toContain('প্রয়োজনীয় নথি আপলোড করুন');

    // Missing upload checklist
    expect(html).toContain('আপলোড করা প্রয়োজন:');
    expect(html).toContain('জাতীয় পরিচয়পত্র — সামনের অংশ');
    expect(html).toContain('জাতীয় পরিচয়পত্র — পেছনের অংশ');

    // Upload form
    expect(html).toContain('upload-form-identity');
    expect(html).toContain('নথির ধরন');
    expect(html).toContain('প্রমাণপত্র আপলোড করুন');

    // Submit button disabled
    expect(html).toMatch(/<button disabled=""[^>]*data-testid="submit-level-identity"/);
  });

  it('renders Tier 2 Academic Qualifications level with uploaded certificates and reviewer remarks', () => {
    const academicLevel: VerificationLevelView = {
      id: 'lvl-academic-002',
      level: 'educational',
      status: 'needs_information',
      assignedReviewerUserId: 'reviewer-admin-001',
      decisionReasonCode: 'illegible_document',
      applicantFeedback: 'সনদের স্ক্যান কপি অস্পষ্ট। অনুগ্রহ করে মূল সনদের রঙিন ও স্পষ্ট ছবি আপলোড করুন।',
      expiresAt: null,
      decidedAt: '2026-10-26T10:00:00Z',
      lastSubmittedAt: '2026-10-25T14:00:00Z',
      submissionCount: 1,
      policyVersion: 'v1.0-bd-tutor-verification',
      version: 2,
      requirements: {
        level: 'educational',
        requiredDocumentTypes: [],
        anyOfDocumentTypes: ['academic_certificate', 'transcript'],
        missingRequiredDocumentTypes: [],
        anyOfSatisfied: false,
        complete: false,
        missingUploadDocumentTypes: ['academic_certificate'],
        submitReady: false,
        nextAction: 'fix_rejected_documents',
      },
      documents: [
        {
          id: 'doc-bsc-degree',
          level: 'educational',
          documentType: 'academic_certificate',
          fileAssetId: 'file-asset-bsc',
          reviewStatus: 'rejected',
          reasonCode: 'illegible_document',
          expiresOn: null,
          createdAt: '2026-10-25T14:00:00Z',
          originalFilename: 'buet_bsc_certificate_scan.jpg',
        },
      ],
    };

    const html = renderWithProviders(
      React.createElement(VerificationLevelCard, {
        record: academicLevel,
        locale: 'bn',
        onChanged: () => {},
      }),
    );

    // Level Header and Status
    expect(html).toContain('শিক্ষাগত যোগ্যতা যাচাইকরণ');
    expect(html).toContain('তথ্য প্রয়োজন');

    // Reviewer feedback box
    expect(html).toContain('পর্যালোচকের মন্তব্য');
    expect(html).toContain('সনদের স্ক্যান কপি অস্পষ্ট');
    expect(html).toContain('illegible_document');

    // Document with rejected status
    expect(html).toContain('শিক্ষাগত সনদপত্র');
    expect(html).toContain('buet_bsc_certificate_scan.jpg');
    expect(html).toContain('প্রত্যাখ্যাত');
  });

  it('renders Tier 3 Institutional verification approved with validity date and re-verification action', () => {
    const institutionalLevel: VerificationLevelView = {
      id: 'lvl-institutional-003',
      level: 'institutional',
      status: 'approved',
      assignedReviewerUserId: 'reviewer-admin-001',
      decisionReasonCode: 'institution_verified',
      applicantFeedback: 'সকল তথ্য ও প্রাতিষ্ঠানিক সুপারিশপত্র যাচাই করে অনুমোদন দেওয়া হলো।',
      expiresAt: '2027-10-26T00:00:00Z',
      decidedAt: '2026-10-26T11:00:00Z',
      lastSubmittedAt: '2026-10-26T09:00:00Z',
      submissionCount: 1,
      policyVersion: 'v1.0-bd-tutor-verification',
      version: 2,
      requirements: {
        level: 'institutional',
        requiredDocumentTypes: [],
        anyOfDocumentTypes: ['employment_letter', 'institution_letter'],
        missingRequiredDocumentTypes: [],
        anyOfSatisfied: true,
        complete: true,
        missingUploadDocumentTypes: [],
        submitReady: false,
        nextAction: 'none',
      },
      documents: [
        {
          id: 'doc-rec-letter',
          level: 'institutional',
          documentType: 'institution_letter',
          fileAssetId: 'file-rec-001',
          reviewStatus: 'approved',
          reasonCode: 'verified',
          expiresOn: null,
          createdAt: '2026-10-26T09:00:00Z',
          originalFilename: 'notredame_recommendation_letter.pdf',
        },
      ],
    };

    const html = renderWithProviders(
      React.createElement(VerificationLevelCard, {
        record: institutionalLevel,
        locale: 'bn',
        onChanged: () => {},
      }),
    );

    expect(html).toContain('প্রাতিষ্ঠানিক ও পেশাগত যাচাইকরণ');
    expect(html).toContain('অনুমোদিত');
    expect(html).toContain('মেয়াদ শেষ:');
    expect(html).toContain('notredame_recommendation_letter.pdf');

    // Reopen / Re-verify button present for approved tier
    expect(html).toContain('reopen-level-institutional');
    expect(html).toContain('পুনরায় যাচাই');
  });

  it('renders Admin VerificationQueueTable with tutor dossier rows and review actions', () => {
    const queueRows: VerificationQueueRow[] = [
      {
        tutorUserId: 'tutor-uuid-rashed',
        displayName: 'রাশেদ করিম (Rashed Karim)',
        email: 'tutor.demo@ogroniedu.com',
        headline: 'BUET Civil Engineering',
        level: 'identity',
        levelStatus: 'submitted',
        pendingDocuments: 2,
        submittedAt: '2026-10-26T12:00:00Z',
        assignedReviewerUserId: null,
        assignedReviewerName: null,
        version: 1,
      },
      {
        tutorUserId: 'tutor-uuid-farhan',
        displayName: 'ফারহান আহমেদ (Farhan Ahmed)',
        email: 'farhan.tutor@ogroniedu.com',
        headline: 'Dhaka University Physics',
        level: 'educational',
        levelStatus: 'under_review',
        pendingDocuments: 1,
        submittedAt: '2026-10-26T11:30:00Z',
        assignedReviewerUserId: 'admin-uuid-001',
        assignedReviewerName: 'সুপার অ্যাডমিন',
        version: 2,
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(VerificationQueueTable, {
        rows: queueRows,
        locale: 'bn',
        onOpen: () => {},
      }),
    );

    expect(html).toContain('verification-table');
    expect(html).toContain('রাশেদ করিম (Rashed Karim)');
    expect(html).toContain('পরিচয় যাচাইকরণ');
    expect(html).toContain('ফারহান আহমেদ (Farhan Ahmed)');
    expect(html).toContain('শিক্ষাগত যোগ্যতা যাচাইকরণ');
    expect(html).toContain('পর্যালোচনা');
    expect(html).toContain('/dashboard/admin/verification/tutor-uuid-rashed');
    expect(html).toContain('/dashboard/admin/verification/tutor-uuid-farhan');
  });

  it('renders empty queue state when no pending verifications exist', () => {
    const html = renderToStaticMarkup(
      React.createElement(VerificationQueueTable, {
        rows: [],
        locale: 'bn',
        onOpen: () => {},
      }),
    );

    expect(html).toContain('পর্যালোচনার অপেক্ষায় কিছু নেই');
    expect(html).toContain('এই ফিল্টারে কোনো যাচাই স্তর অপেক্ষমাণ নেই।');
  });
});
