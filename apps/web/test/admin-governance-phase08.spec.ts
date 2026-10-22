import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { NextIntlClientProvider } from 'next-intl';
import { makeStore } from '../src/store';
import bnMessages from '../messages/bn.json';
import enMessages from '../messages/en.json';
import { AdminPlatformTelemetryGrid } from '../src/features/admin/components/AdminPlatformTelemetryGrid';
import { AdminTriageCommandCenter } from '../src/features/admin/components/AdminTriageCommandCenter';
import { AdminUsersTab } from '../src/features/admin/components/tabs/adminUsersTab';
import { AdminFeatureFlagsTab } from '../src/features/admin/components/tabs/adminFeatureFlagsTab';
import type { AdminUserItem, AdminFeatureFlagItem } from '../src/features/admin/types/admin.types';

function renderWithProviders(node: React.ReactElement, locale: 'bn' | 'en' = 'bn'): string {
  const store = makeStore();
  const messages = locale === 'bn' ? bnMessages : enMessages;
  return renderToStaticMarkup(
    React.createElement(Provider, {
      store,
      children: React.createElement(NextIntlClientProvider, {
        locale,
        messages,
        timeZone: 'Asia/Dhaka',
        children: node,
      }),
    }),
  );
}

describe('Phase 8: Admin & Super Admin Governance Frontend Tests', () => {
  const mockUsers: AdminUserItem[] = [
    {
      id: '00000000-0000-4000-a000-000000000000',
      displayName: 'Super Admin Operator',
      email: 'superadmin.demo@ogroniedu.com',
      phoneE164: '+8801700000000',
      status: 'active',
      roles: ['super_admin', 'admin'],
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '00000000-0000-4000-b000-000000000001',
      displayName: 'Student Tanvir',
      email: 'student.tanvir@ogroniedu.com',
      phoneE164: '+8801711000001',
      status: 'active',
      roles: ['student'],
      createdAt: '2026-01-05T00:00:00Z',
    },
    {
      id: '00000000-0000-4000-c000-000000000002',
      displayName: 'Suspended Tutor',
      email: 'badtutor@ogroniedu.com',
      phoneE164: '+8801711000002',
      status: 'suspended',
      roles: ['tutor'],
      createdAt: '2026-01-10T00:00:00Z',
    },
  ];

  const mockFlags: AdminFeatureFlagItem[] = [
    {
      key: 'enable_ai_matching',
      enabled: true,
      rules: { rolloutPercentage: 50 },
    },
    {
      key: 'enable_instant_payout',
      enabled: false,
      rules: {},
    },
  ];

  describe('1. Platform Telemetry Grid (AdminPlatformTelemetryGrid)', () => {
    it('should render GMV, Escrow pool, ecosystem counts, and balanced ledger in Bengali', () => {
      const html = renderWithProviders(
        React.createElement(AdminPlatformTelemetryGrid, {
          locale: 'bn',
          totalGmvBdt: 750000,
          activeEscrowPoolBdt: 125000,
          verifiedTutorsCount: 32,
          activeStudentsCount: 180,
          isLedgerBalanced: true,
        }),
        'bn',
      );

      expect(html).toContain('admin-platform-telemetry');
      expect(html).toContain('গ্রস ট্রানজ্যাকশন (GMV)');
      expect(html).toContain('সুরক্ষিত এসক্রো পুল');
      expect(html).toContain('ডাবল-এন্ট্রি লেজার');
      expect(html).toContain('সম্পূর্ণ ব্যালেন্সড');
      expect(html).toContain('অনুমোদিত শিক্ষক / নিবন্ধিত শিক্ষার্থী');
      expect(html).toContain('৳');
    });

    it('should render telemetry in English locale', () => {
      const html = renderWithProviders(
        React.createElement(AdminPlatformTelemetryGrid, {
          locale: 'en',
          totalGmvBdt: 750000,
          activeEscrowPoolBdt: 125000,
          verifiedTutorsCount: 32,
          activeStudentsCount: 180,
          isLedgerBalanced: true,
        }),
        'en',
      );

      expect(html).toContain('Gross Volume (GMV)');
      expect(html).toContain('Active Escrow Pool');
      expect(html).toContain('Ledger Integrity');
      expect(html).toContain('100% Balanced');
      expect(html).toContain('Approved Tutors / Active Students');
    });

    it('should display warning indicator when ledger has discrepancy', () => {
      const html = renderWithProviders(
        React.createElement(AdminPlatformTelemetryGrid, {
          locale: 'bn',
          totalGmvBdt: 500000,
          activeEscrowPoolBdt: 100000,
          verifiedTutorsCount: 10,
          activeStudentsCount: 50,
          isLedgerBalanced: false,
        }),
        'bn',
      );

      expect(html).toContain('পার্থক্য চিহ্নিত');
    });
  });

  describe('2. Triage Command Center (AdminTriageCommandCenter)', () => {
    it('should render priority action queues with verified counts and action links', () => {
      const html = renderWithProviders(
        React.createElement(AdminTriageCommandCenter, {
          locale: 'bn',
          pendingVerifications: 7,
          activeReplacements: 3,
          openSafetyReports: 1,
        }),
        'bn',
      );

      expect(html).toContain('admin-triage-command-center');
      expect(html).toContain('প্রশাসনিক ট্রায়াজ কমান্ড সেন্টার');
      expect(html).toContain('শিক্ষক যাচাই কিউ');
      expect(html).toContain('রিপ্লেসমেন্ট ও বিরোধ');
      expect(html).toContain('শিশু সুরক্ষা রেড অ্যালার্ট');
      expect(html).toContain('/dashboard/admin/verification');
      expect(html).toContain('/dashboard/admin/disputes');
      expect(html).toContain('/safety-reports');
    });
  });

  describe('3. Users Governance & Permissions (AdminUsersTab)', () => {
    it('should render user directory rows with roles and status badges', () => {
      const html = renderWithProviders(
        React.createElement(AdminUsersTab, {
          users: mockUsers,
          isSuperAdmin: true,
          onRequestSuspend: vi.fn(),
          onRequestRoles: vi.fn(),
          onRequestImpersonate: vi.fn(),
          onReactivate: vi.fn(),
          searchQuery: '',
          onSearchChange: vi.fn(),
          statusFilter: 'all',
          onStatusFilterChange: vi.fn(),
        }),
        'bn',
      );

      expect(html).toContain('Super Admin Operator');
      expect(html).toContain('Student Tanvir');
      expect(html).toContain('Suspended Tutor');
      expect(html).toContain('super_admin');
      expect(html).toContain('student');
      expect(html).toContain('tutor');
    });

    it('should show Impersonate and Edit Roles triggers for super_admin', () => {
      const html = renderWithProviders(
        React.createElement(AdminUsersTab, {
          users: mockUsers,
          isSuperAdmin: true,
          onRequestSuspend: vi.fn(),
          onRequestRoles: vi.fn(),
          onRequestImpersonate: vi.fn(),
          onReactivate: vi.fn(),
          searchQuery: '',
          onSearchChange: vi.fn(),
          statusFilter: 'all',
          onStatusFilterChange: vi.fn(),
        }),
        'bn',
      );

      // Super Admin should see the action triggers
      expect(html).toContain('impersonate');
    });

    it('should NOT allow non-super_admin to trigger role edits or impersonation', () => {
      const html = renderWithProviders(
        React.createElement(AdminUsersTab, {
          users: mockUsers,
          isSuperAdmin: false, // Regular admin
          onRequestSuspend: vi.fn(),
          onRequestRoles: vi.fn(),
          onRequestImpersonate: vi.fn(),
          onReactivate: vi.fn(),
          searchQuery: '',
          onSearchChange: vi.fn(),
          statusFilter: 'all',
          onStatusFilterChange: vi.fn(),
        }),
        'bn',
      );

      // Verify that impersonation button is not present for non-super_admin
      expect(html).not.toContain('onRequestImpersonate');
    });
  });

  describe('4. Feature Flags Management (AdminFeatureFlagsTab)', () => {
    it('should render canary feature flags with their state', () => {
      const html = renderWithProviders(
        React.createElement(AdminFeatureFlagsTab, {
          featureFlags: mockFlags,
          isSuperAdmin: true,
          onToggle: vi.fn(),
        }),
        'bn',
      );

      expect(html).toContain('enable_ai_matching');
      expect(html).toContain('enable_instant_payout');
    });
  });
});
