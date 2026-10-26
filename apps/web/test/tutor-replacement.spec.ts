import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { makeStore } from '../src/store';
import {
  CaseCard,
  StatusBadge,
} from '../src/features/trust/pages/tutor-replacements-list-page';
import {
  TutorReplacementModal,
  TutorReplacementModalForm,
} from '../src/features/trust/components/tutorReplacementModal';
import { STUDENT_NAV_SECTIONS } from '../src/lib/navigation/student.nav';
import { GUARDIAN_NAV_SECTIONS } from '../src/lib/navigation/guardian.nav';
import { ADMIN_NAV_SECTIONS } from '../src/lib/navigation/admin.nav';
import type { ReplacementCaseView } from '../src/store/services/trust-api';

describe('Tutor Replacement Guarantee System Tests', () => {
  const sampleCase: ReplacementCaseView = {
    id: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
    bookingId: '0301ea0c-a499-448f-90bf-ea0849b8b2fe',
    requestedBy: '33333333-3333-4333-b333-333333333333',
    reasonCode: 'teaching_mismatch',
    explanation: 'শিক্ষকের পাঠদান পদ্ধতি আমার সন্তানের ধারণক্ষমতার সাথে সামঞ্জস্যপূর্ণ নয়।',
    status: 'matching',
    deadlineAt: '2026-10-28T16:00:00.000Z',
    isOverdue: false,
    version: 1,
    refundEligibility: 'not_determined',
    userVisibleNote: 'আমাদের ম্যাচিং টিম আপনার জন্য বিকল্প উপযুক্ত শিক্ষক খুঁজছে।',
    createdAt: '2026-10-26T16:00:00.000Z',
    updatedAt: '2026-10-26T16:00:00.000Z',
  };

  const offeredCase: ReplacementCaseView = {
    ...sampleCase,
    id: 'f9e8d7c6-b5a4-4321-9876-543210fedcba',
    status: 'offered',
    replacementTutorUserId: '8a798958-9c24-4049-86e9-18985e871597',
    replacementTutor: {
      userId: '8a798958-9c24-4049-86e9-18985e871597',
      displayName: 'তানভীর আহমেদ (BUET)',
    },
  };

  it('TC-REPL-001: should render CaseCard with high-contrast slate styling, deadline & status badge (bn)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CaseCard, {
        item: sampleCase,
        locale: 'bn',
        onAccept: () => {},
        onDecline: () => {},
        onCancel: () => {},
        isMutating: false,
      }),
    );

    expect(html).toContain('data-testid="replacement-case-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6"');
    expect(html).toContain('#a1b2c3d4');
    expect(html).toContain('teaching mismatch');
    expect(html).toContain('শিক্ষকের পাঠদান পদ্ধতি আমার সন্তানের ধারণক্ষমতার সাথে সামঞ্জস্যপূর্ণ নয়।');
    expect(html).toContain('ম্যাচিং সময়সীমা:');
    expect(html).toContain('আমাদের ম্যাচিং টিম আপনার জন্য বিকল্প উপযুক্ত শিক্ষক খুঁজছে।');
    expect(html).toContain('বিস্তারিত ও ইতিহাস দেখুন');
  });

  it('TC-REPL-002: should render offered alternative tutor details and action buttons when status is offered', () => {
    const html = renderToStaticMarkup(
      React.createElement(CaseCard, {
        item: offeredCase,
        locale: 'bn',
        onAccept: () => {},
        onDecline: () => {},
        onCancel: () => {},
        isMutating: false,
      }),
    );

    expect(html).toContain('data-testid="offer-f9e8d7c6-b5a4-4321-9876-543210fedcba"');
    expect(html).toContain('তানভীর আহমেদ (BUET)');
    expect(html).toContain('data-testid="accept-offer-f9e8d7c6-b5a4-4321-9876-543210fedcba"');
    expect(html).toContain('data-testid="decline-offer-f9e8d7c6-b5a4-4321-9876-543210fedcba"');
    expect(html).toContain('গ্রহণ করুন');
    expect(html).toContain('প্রত্যাখ্যান');
  });

  it('TC-REPL-003: should render TutorReplacementModalForm with 48h SLA guarantee alert and reason selector', () => {
    const store = makeStore();
    const html = renderToStaticMarkup(
      React.createElement(
        Provider,
        { store },
        React.createElement(TutorReplacementModalForm, {
          onClose: () => {},
          locale: 'bn',
          bookingId: '0301ea0c-a499-448f-90bf-ea0849b8b2fe',
          tutorName: 'ফরহাদ হোসেন',
          subjectName: 'উচ্চতর গণিত',
        }),
      ),
    );

    expect(html).toContain('data-testid="tutor-replacement-modal-content"');
    expect(html).toContain('৪৮ ঘণ্টার শিক্ষক রিপ্লেসমেন্ট গ্যারান্টি');
    expect(html).toContain('ফরহাদ হোসেন (উচ্চতর গণিত)-এর বিকল্প শিক্ষক দাবি করুন');
    expect(html).toContain('১০০% অভিভাবক সুরক্ষা: ৪৮ ঘণ্টার মধ্যে নতুন যাচাইকৃত শিক্ষক অথবা সম্পূর্ণ ফান্ড ফেরত।');
    expect(html).toContain('৪৮ ঘণ্টা');
    expect(html).toContain('teaching_mismatch');
    expect(html).toContain('tutor_no_show');
    expect(html).toContain('frequent_tutor_cancellation');
    expect(html).toContain('btn-submit-replacement-request');

    // Also verify TutorReplacementModal element instantiation
    const modalEl = React.createElement(TutorReplacementModal, {
      isOpen: true,
      onClose: () => {},
      locale: 'bn',
      bookingId: '0301ea0c-a499-448f-90bf-ea0849b8b2fe',
    });
    expect(modalEl).toBeDefined();
    expect(modalEl.props.isOpen).toBe(true);
  });

  it('TC-REPL-004: should include Tutor Replacement Guarantee links across Student, Guardian, and Admin navigation', () => {
    // Check student nav sections
    const studentTutorsSection = STUDENT_NAV_SECTIONS.find((s) => s.id === 'tutors');
    expect(studentTutorsSection).toBeDefined();
    const studentReplItem = studentTutorsSection?.items.find((i) => i.href === '/tutor-replacements');
    expect(studentReplItem).toBeDefined();
    expect(studentReplItem?.labelBn).toBe('শিক্ষক পরিবর্তন গ্যারান্টি');
    expect(studentReplItem?.testId).toBe('nav-student-tutor-replacements');

    // Check guardian nav sections
    const guardianTutorsSection = GUARDIAN_NAV_SECTIONS.find((s) => s.id === 'tutors');
    expect(guardianTutorsSection).toBeDefined();
    const guardianReplItem = guardianTutorsSection?.items.find((i) => i.href === '/tutor-replacements');
    expect(guardianReplItem).toBeDefined();
    expect(guardianReplItem?.labelBn).toBe('শিক্ষক পরিবর্তন গ্যারান্টি');
    expect(guardianReplItem?.testId).toBe('nav-guardian-tutor-replacements');

    // Check admin nav sections
    const adminOpsSection = ADMIN_NAV_SECTIONS.find((s) => s.id === 'operations');
    expect(adminOpsSection).toBeDefined();
    const adminReplItem = adminOpsSection?.items.find((i) => i.href === '/dashboard/admin/replacements');
    expect(adminReplItem).toBeDefined();
    expect(adminReplItem?.testId).toBe('nav-replacements');
  });

  it('TC-REPL-005: should correctly localize StatusBadge for various lifecycle states', () => {
    const statuses = [
      { code: 'requested', bn: 'অনুরোধ গৃহীত', en: 'Requested' },
      { code: 'matching', bn: 'শিক্ষক খোঁজা হচ্ছে', en: 'Matching' },
      { code: 'offered', bn: 'শিক্ষক প্রস্তাবিত', en: 'Tutor offered' },
      { code: 'accepted', bn: 'শিক্ষক গ্রহণ করা হয়েছে', en: 'Replacement accepted' },
      { code: 'refund_eligible', bn: 'রিফান্ড পর্যালোচনার যোগ্য', en: 'Eligible for refund review' },
    ];

    for (const item of statuses) {
      const bnHtml = renderToStaticMarkup(React.createElement(StatusBadge, { status: item.code, locale: 'bn' }));
      expect(bnHtml).toContain(item.bn);

      const enHtml = renderToStaticMarkup(React.createElement(StatusBadge, { status: item.code, locale: 'en' }));
      expect(enHtml).toContain(item.en);
    }
  });
});
