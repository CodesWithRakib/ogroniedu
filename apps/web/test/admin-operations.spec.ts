import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  AdminDashboardView,
  AdminUserItem,
  AdminBookingItem,
  AdminReconciliationData,
} from '../src/components/admin/AdminDashboardView';
import { getDictionary } from '../src/lib/i18n';

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
      { code: '1010_CASH_SSLCOMMERZ', name: 'SSLCOMMERZ Settlement', accountType: 'asset', balance: '500,000' },
      { code: '2010_STUDENT_ESCROW', name: 'Student Escrow Holding', accountType: 'liability', balance: '500,000' },
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

    expect(bnDict.admin.impersonationWarning).toContain('সুপার-এডমিন জরুরি প্রোটোকল: সর্বোচ্চ ১৫ মিনিট');
    expect(enDict.admin.impersonationWarning).toContain('Super-Admin Emergency Protocol: 15-Minute Strict Limit');

    expect(bnDict.admin.auditRedactedNotice).toContain('স্বয়ংক্রিয় ক্রেডেনশিয়াল ও গোপনীয় তথ্য মাস্কিং সক্রিয়');
    expect(enDict.admin.auditRedactedNotice).toContain('Automated Secret & Credential Redaction Active');
  });
});
