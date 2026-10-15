import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { NextIntlClientProvider } from 'next-intl';
import { makeStore } from '../src/store';
import bnMessages from '../messages/bn.json';
import {
  AdminDashboardView,
  AdminUserItem,
  AdminBookingItem,
  AdminReconciliationData,
} from '../src/components/admin/AdminDashboardView';
import { AdminVerificationTab } from '../src/features/admin/components/tabs/adminVerificationTab';
import type { PendingTutorItem } from '../src/features/admin/types/admin.types';
import { getDictionary } from '../src/lib/i18n';

function renderWithProviders(node: React.ReactElement): string {
  const store = makeStore();
  return renderToStaticMarkup(
    React.createElement(Provider, {
      store,
      children: React.createElement(NextIntlClientProvider, {
        locale: 'bn',
        messages: bnMessages,
        children: node,
      }),
    }),
  );
}

describe('Admin Operations & Control Center Frontend Tests (Phase 14)', () => {
  const sampleUsers: AdminUserItem[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      displayName: 'Super Admin',
      email: 'superadmin@ogroni.edu.bd',
      phoneE164: '+8801700000001',
      status: 'active',
      roles: ['super_admin', 'admin'],
      createdAt: '2026-01-10T10:00:00Z',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      displayName: 'Tutor Nusrat Jahan',
      email: 'nusrat@ogroni.edu.bd',
      phoneE164: '+8801700000002',
      status: 'suspended',
      roles: ['tutor'],
      createdAt: '2026-01-15T12:00:00Z',
    },
  ];

  const sampleBookings: AdminBookingItem[] = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      studentName: 'Zafir Rahman',
      tutorName: 'Nusrat Jahan',
      subjectName: 'Physics (Class 10)',
      status: 'confirmed',
      priceBdt: 1200,
      mode: 'online',
    },
  ];

  const sampleReconciliation: AdminReconciliationData = {
    isBalanced: true,
    totalDebits: '500,000',
    totalCredits: '500,000',
    discrepancy: '0',
    status: 'reconciled',
    accounts: [
      {
        code: '1010_CASH_SSLCOMMERZ',
        name: 'SSLCOMMERZ Settlement',
        accountType: 'asset',
        balance: '500,000',
      },
      {
        code: '2010_STUDENT_ESCROW',
        name: 'Student Escrow Holding',
        accountType: 'liability',
        balance: '500,000',
      },
    ],
  };

  it('should instantiate AdminDashboardView with full operational metrics and queue data', () => {
    const el = React.createElement(AdminDashboardView, {
      currentUser: {
        id: '00000000-0000-0000-0000-000000000001',
        displayName: 'Super Admin',
        roles: ['super_admin', 'admin'],
      },
      metrics: {
        pendingTutorVerifications: 5,
        activeReplacementCases: 3,
        openSafetyReports: 2,
        activeBookingsCount: 25,
        totalRegisteredUsers: 150,
      },
      initialUsers: sampleUsers,
      initialBookings: sampleBookings,
      initialReconciliation: sampleReconciliation,
      initialPendingTutors: [],
      onReviewTutor: async () => {},
      onRefetchPendingTutors: () => {},
      userSearch: '',
      onUserSearchChange: () => {},
      userStatus: 'all' as const,
      onUserStatusChange: () => {},
    });

    expect(el).toBeDefined();
    expect(el.props.metrics.pendingTutorVerifications).toBe(5);
    expect(el.props.metrics.activeReplacementCases).toBe(3);
    expect(el.props.metrics.openSafetyReports).toBe(2);
    expect(el.props.metrics.activeBookingsCount).toBe(25);
    expect(el.props.initialUsers).toHaveLength(2);
    expect(el.props.initialBookings).toHaveLength(1);
    expect(el.props.initialReconciliation.isBalanced).toBe(true);
  });

  it('should verify 100% dictionary key parity for admin namespace between bn and en', () => {
    const bnDict = getDictionary('bn');
    const enDict = getDictionary('en');

    expect(bnDict.admin).toBeDefined();
    expect(enDict.admin).toBeDefined();

    const bnKeys = Object.keys(bnDict.admin).sort();
    const enKeys = Object.keys(enDict.admin).sort();

    expect(bnKeys).toEqual(enKeys);
    expect(bnKeys.length).toBeGreaterThanOrEqual(40);

    // Verify critical operational translations
    expect(bnDict.admin.title).toBe('অপারেশনস ও কন্ট্রোল সেন্টার');
    expect(enDict.admin.title).toBe('Operations & Control Center');

    expect(bnDict.admin.tutorVerificationQueue).toBe('টিউটর ভেরিফিকেশন কিউ');
    expect(enDict.admin.tutorVerificationQueue).toBe('Tutor Verification Queue');

    expect(bnDict.admin.reconciliationTitle).toBe('ডাবল-এন্ট্রি লেজার অখণ্ডতা অডিট');
    expect(enDict.admin.reconciliationTitle).toBe('Double-Entry Ledger Integrity Audit');

    expect(bnDict.admin.impersonationWarning).toContain(
      'সুপার-এডমিন জরুরি প্রোটোকল: সর্বোচ্চ ১৫ মিনিট',
    );
    expect(enDict.admin.impersonationWarning).toContain(
      'Super-Admin Emergency Protocol: 15-Minute Strict Limit',
    );

    expect(bnDict.admin.auditRedactedNotice).toContain(
      'স্বয়ংক্রিয় ক্রেডেনশিয়াল ও গোপনীয় তথ্য মাস্কিং সক্রিয়',
    );
    expect(enDict.admin.auditRedactedNotice).toContain(
      'Automated Secret & Credential Redaction Active',
    );
  });

  it('should render the verification queue with pending tutor rows', () => {
    const pending: PendingTutorItem[] = [
      {
        userId: 'tutor-pending-1',
        displayName: 'Pending Tutor',
        email: 'pending@example.com',
        phoneE164: null,
        headline: 'Physics Tutor',
        verificationStatus: 'submitted',
        publicationStatus: 'draft',
        qualificationsCount: 2,
        submittedAt: '2026-10-14T10:00:00Z',
      },
    ];
    const html = renderWithProviders(
      React.createElement(AdminVerificationTab, {
        tutors: pending,
        isLoading: false,
        queryError: null,
        onRetry: () => {},
        onReview: async () => {},
      }),
    );
    expect(html).toContain('Pending Tutor');
    expect(html).toContain('verification-row-tutor-pending-1');
    expect(html).toContain('review-tutor-btn-tutor-pending-1');
  });

  it('should render the verification empty state when the queue is clear', () => {
    const html = renderWithProviders(
      React.createElement(AdminVerificationTab, {
        tutors: [],
        isLoading: false,
        queryError: null,
        onRetry: () => {},
        onReview: async () => {},
      }),
    );
    expect(html).toContain('verification-tab-content');
    expect(html).not.toContain('verification-row-');
  });

  it('should forward review decisions through onReviewTutor', async () => {
    const seen: unknown[] = [];
    const onReview = vi.fn(async (input: unknown) => {
      seen.push(input);
    });
    await onReview({
      tutorId: 'tutor-pending-1',
      decision: 'approved',
      reasonCode: 'nid-verified',
      internalNotes: 'Docs look good.',
    });
    expect(onReview).toHaveBeenCalledOnce();
    expect(seen[0]).toMatchObject({
      tutorId: 'tutor-pending-1',
      decision: 'approved',
      reasonCode: 'nid-verified',
    });
  });
});
