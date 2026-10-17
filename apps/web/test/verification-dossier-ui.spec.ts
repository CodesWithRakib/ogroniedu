import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { NextIntlClientProvider } from 'next-intl';
import { makeStore } from '../src/store';
import bnMessages from '../messages/bn.json';
import { VerificationLevelCard } from '../src/features/tutors/components/verificationLevelCard';
import type { VerificationLevelView } from '../src/store/services/tutors-api';
import {
  allowedDocumentTypes,
  canReopenLevel,
  canSubmitLevel,
  documentTypeLabel,
  isEvidenceEditable,
  levelLabel,
  levelStatusLabel,
  levelStatusTone,
  missingDocumentLabels,
  nextActionLabel,
} from '../src/features/tutors/utils/verification-ui';
import type { VerificationLevelRequirementsView } from '../src/store/services/tutors-api';

function requirements(
  overrides: Partial<VerificationLevelRequirementsView> = {},
): VerificationLevelRequirementsView {
  return {
    level: 'identity',
    requiredDocumentTypes: ['nid_front', 'nid_back'],
    anyOfDocumentTypes: [],
    missingRequiredDocumentTypes: [],
    anyOfSatisfied: true,
    complete: true,
    nextAction: 'submit_level',
    ...overrides,
  };
}

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

function levelRecord(overrides: Partial<VerificationLevelView> = {}): VerificationLevelView {
  return {
    id: 'level-1',
    level: 'identity',
    status: 'draft',
    assignedReviewerUserId: null,
    decisionReasonCode: null,
    applicantFeedback: null,
    expiresAt: null,
    decidedAt: null,
    lastSubmittedAt: null,
    submissionCount: 0,
    policyVersion: 'v1.0-bd-tutor-verification',
    version: 1,
    requirements: requirements({
      complete: false,
      missingRequiredDocumentTypes: ['nid_back'],
      nextAction: 'upload_documents',
    }),
    documents: [
      {
        id: 'doc-1',
        level: 'identity',
        documentType: 'nid_front',
        fileAssetId: 'file-1',
        reviewStatus: 'approved',
        reasonCode: null,
        expiresOn: null,
        createdAt: '2026-10-01T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('Tutor verification level card', () => {
  it('renders outstanding evidence and keeps submit disabled until complete', () => {
    const html = renderWithProviders(
      React.createElement(VerificationLevelCard, {
        record: levelRecord(),
        locale: 'bn',
        onChanged: () => {},
      }),
    );
    expect(html).toContain('পরিচয় যাচাইকরণ');
    expect(html).toContain('জাতীয় পরিচয়পত্র — পেছনের অংশ');
    expect(html).toContain('upload-form-identity');
    expect(html).toMatch(/<button disabled=""[^>]*data-testid="submit-level-identity"/);
  });

  it('hides applicant actions while the level is with the reviewer', () => {
    const html = renderWithProviders(
      React.createElement(VerificationLevelCard, {
        record: levelRecord({
          status: 'under_review',
          applicantFeedback: 'Please upload a clearer back side.',
          requirements: requirements({ complete: true, nextAction: 'await_review' }),
        }),
        locale: 'en',
        onChanged: () => {},
      }),
    );
    expect(html).toContain('Under review');
    expect(html).toContain('Please upload a clearer back side.');
    expect(html).not.toContain('upload-form-identity');
    expect(html).not.toContain('submit-level-identity');
    expect(html).not.toContain('reopen-level-identity');
  });

  it('offers re-verification for an approved level', () => {
    const html = renderWithProviders(
      React.createElement(VerificationLevelCard, {
        record: levelRecord({
          status: 'approved',
          expiresAt: '2036-10-10T00:00:00.000Z',
          requirements: requirements({ complete: true, nextAction: 'none' }),
        }),
        locale: 'en',
        onChanged: () => {},
      }),
    );
    expect(html).toContain('reopen-level-identity');
    expect(html).toContain('Valid until');
    expect(html).not.toContain('upload-form-identity');
  });
});

describe('Verification dossier UI rules', () => {
  it('only allows evidence edits while the level is with the applicant', () => {
    expect(isEvidenceEditable('not_started')).toBe(true);
    expect(isEvidenceEditable('draft')).toBe(true);
    expect(isEvidenceEditable('needs_information')).toBe(true);
    expect(isEvidenceEditable('rejected')).toBe(true);
    expect(isEvidenceEditable('expired')).toBe(true);
    expect(isEvidenceEditable('submitted')).toBe(false);
    expect(isEvidenceEditable('under_review')).toBe(false);
    expect(isEvidenceEditable('approved')).toBe(false);
    expect(isEvidenceEditable('suspended')).toBe(false);
  });

  it('mirrors the server resubmission cap after a rejection', () => {
    expect(canSubmitLevel('draft', 0)).toBe(true);
    expect(canSubmitLevel('needs_information', 1)).toBe(true);
    expect(canSubmitLevel('rejected', 2)).toBe(true);
    expect(canSubmitLevel('rejected', 3)).toBe(false);
    expect(canSubmitLevel('submitted', 0)).toBe(false);
    expect(canSubmitLevel('approved', 1)).toBe(false);
  });

  it('offers re-verification only for approved or expired levels', () => {
    expect(canReopenLevel('approved')).toBe(true);
    expect(canReopenLevel('expired')).toBe(true);
    expect(canReopenLevel('draft')).toBe(false);
    expect(canReopenLevel('submitted')).toBe(false);
  });

  it('lists only the document types that belong to each level', () => {
    const identity = allowedDocumentTypes('identity');
    expect(identity).toContain('nid_front');
    expect(identity).toContain('nid_back');
    expect(identity).toContain('selfie_with_nid');
    expect(identity).not.toContain('transcript');

    const educational = allowedDocumentTypes('educational');
    expect(educational).toContain('academic_certificate');
    expect(educational).toContain('transcript');
    expect(educational).toContain('other_supporting');
    expect(educational).not.toContain('nid_front');

    const institutional = allowedDocumentTypes('institutional');
    expect(institutional).toContain('institution_letter');
    expect(institutional).toContain('employment_letter');
    expect(institutional).toContain('professional_certificate');
    expect(institutional).not.toContain('nid_back');
  });

  it('maps statuses to badge tones and localized labels', () => {
    expect(levelStatusTone('approved')).toBe('success');
    expect(levelStatusTone('submitted')).toBe('info');
    expect(levelStatusTone('needs_information')).toBe('warning');
    expect(levelStatusTone('rejected')).toBe('destructive');
    expect(levelStatusTone('expired')).toBe('destructive');

    expect(levelStatusLabel('approved', 'en')).toBe('Approved');
    expect(levelStatusLabel('approved', 'bn')).toBe('অনুমোদিত');
    expect(levelLabel('identity', 'en')).toBe('Identity Verification');
    expect(levelLabel('identity', 'bn')).not.toBe('Identity Verification');
  });

  it('localizes document types and next actions', () => {
    expect(documentTypeLabel('nid_front', 'en')).toBe('National ID — Front');
    expect(documentTypeLabel('nid_front', 'bn')).toContain('জাতীয়');
    expect(nextActionLabel('await_review', 'en')).toBe('Awaiting reviewer decision');
    expect(nextActionLabel('upload_documents', 'bn')).toContain('আপলোড');
  });

  it('turns outstanding requirements into human-readable labels', () => {
    expect(missingDocumentLabels(requirements(), 'en')).toEqual([]);

    const pending = missingDocumentLabels(
      requirements({
        complete: false,
        anyOfSatisfied: true,
        missingRequiredDocumentTypes: ['nid_back'],
        nextAction: 'upload_documents',
      }),
      'en',
    );
    expect(pending).toEqual(['National ID — Back']);

    const educational = missingDocumentLabels(
      requirements({
        level: 'educational',
        requiredDocumentTypes: [],
        anyOfDocumentTypes: ['academic_certificate', 'transcript'],
        missingRequiredDocumentTypes: [],
        anyOfSatisfied: false,
        complete: false,
        nextAction: 'upload_documents',
      }),
      'en',
    );
    expect(educational).toHaveLength(1);
    expect(educational[0]).toContain('Academic Certificate');
    expect(educational[0]).toContain('Transcript');
  });
});
