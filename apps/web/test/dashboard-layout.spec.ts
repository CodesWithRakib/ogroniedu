import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/bn/dashboard/student',
}));

import { UserNavDropdown } from '../src/features/dashboard/components/UserNavDropdown';
import { DashboardSidebar } from '../src/features/dashboard/components/DashboardSidebar';
import { DashboardShell } from '../src/features/dashboard/components/DashboardShell';
import { navForRole } from '../src/lib/navigation';
import { Provider } from 'react-redux';
import { makeStore, setCredentials } from '../src/store';
import { NotificationProvider } from '../src/components/notifications/NotificationProvider';

function createMockStore(role: 'student' | 'tutor' | 'guardian' | 'admin' = 'student') {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      user: {
        id: 'user-test-123',
        phone: '+8801700000000',
        displayName: 'রকিবুল হাসান',
        email: 'rakibul@ogroni.edu',
        roles: [role],
        preferredLocale: 'bn',
      },
      token: 'mock-jwt-token',
      refreshToken: 'mock-refresh-token',
    }),
  );
  return store;
}

describe('Role Dashboard Architecture & Layout Tests', () => {
  describe('UserNavDropdown (Header User Menu)', () => {
    it('renders user button trigger with initials and display name', () => {
      const mockLogout = vi.fn();
      const mockUser = {
        id: 'user-1',
        phone: '+8801712345678',
        displayName: 'রকিবুল হাসান',
        email: 'rakib@ogroni.edu',
        roles: ['student' as const],
        isPhoneVerified: true,
        status: 'active' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const html = renderToStaticMarkup(
        React.createElement(UserNavDropdown, {
          authUser: mockUser,
          locale: 'bn',
          role: 'student',
          onLogout: mockLogout,
        }),
      );

      // Trigger button should have data-testid
      expect(html).toContain('data-testid="user-nav-dropdown-trigger"');
      // Should show initials / display name
      expect(html).toContain('রকিবুল হাসান');
      // Should show student role badge in Bengali
      expect(html).toContain('শিক্ষার্থী');
    });

    it('renders English role badge and user info correctly', () => {
      const mockLogout = vi.fn();
      const mockUser = {
        id: 'user-2',
        phone: '+8801812345678',
        displayName: 'John Doe',
        email: 'john@example.com',
        roles: ['tutor' as const],
        isPhoneVerified: true,
        status: 'active' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const html = renderToStaticMarkup(
        React.createElement(UserNavDropdown, {
          authUser: mockUser,
          locale: 'en',
          role: 'tutor',
          onLogout: mockLogout,
        }),
      );

      expect(html).toContain('John Doe');
      expect(html).toContain('Verified Tutor');
    });
  });

  describe('DashboardSidebar (Clean Sidebar without Logout)', () => {
    it('does NOT contain logout button in the sidebar', () => {
      const mockUser = {
        id: 'user-1',
        phone: '+8801712345678',
        displayName: 'তন্ময় আহমেদ',
        email: 'tonmoy@example.com',
        roles: ['tutor' as const],
        isPhoneVerified: true,
        status: 'active' as const,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };

      const DummyIcon = () => React.createElement('span', null, 'Icon');

      const html = renderToStaticMarkup(
        React.createElement(DashboardSidebar, {
          items: [
            {
              href: '/dashboard/tutor',
              labelBn: 'ওভারভিউ',
              labelEn: 'Overview',
              icon: DummyIcon,
              testId: 'nav-overview',
            },
          ],
          locale: 'bn',
          isBn: true,
          pathname: '/bn/dashboard/tutor',
          roleKey: 'tutor',
          authUser: mockUser,
          userInitials: 'TA',
        }),
      );

      // Verify sidebar renders branding
      expect(html).toContain('Ogroni');
      expect(html).toContain('Edu');
      // Verify account / promo link is present
      expect(html).toContain('/bn/profile');
      // User info card is removed from sidebar per user design update (placed in header UserNavDropdown instead)
      expect(html).not.toContain('তন্ময় আহমেদ');
      expect(html).toContain('অগ্রণী এডু অ্যাপ');

      // CRITICAL REQUIREMENT: Sidebar must NOT have any logout / signout button
      expect(html).not.toContain('header-signout-btn');
      expect(html).not.toContain('লগআউট');
      expect(html).not.toContain('Log out');
      expect(html).not.toContain('Logout');
      expect(html).not.toContain('সাইন আউট');
    });
  });

  describe('DashboardShell (Sticky Topbar & Scrollable Main Page)', () => {
    it('renders sticky topbar and scrollable main page container', () => {
      const store = createMockStore('student');

      const html = renderToStaticMarkup(
        React.createElement(
          Provider,
          { store },
          React.createElement(
            NotificationProvider,
            null,
            React.createElement(
              DashboardShell,
              {
                role: 'student',
                locale: 'bn',
                title: 'শিক্ষার্থী ড্যাশবোর্ড',
                subtitle: 'আপনার পড়াশোনা ও ক্লাস মনিটরিং',
              },
              React.createElement('div', { id: 'test-child-content' }, 'Child content loaded'),
            ),
          ),
        ),
      );

      // Verify dashboard shell container exists
      expect(html).toContain('data-testid="dashboard-shell"');
      // Verify main container has overflow-y-auto for independent scrolling
      expect(html).toContain('overflow-y-auto');
      expect(html).toContain('id="main-content"');
      // Verify title & subtitle are rendered
      expect(html).toContain('শিক্ষার্থী ড্যাশবোর্ড');
      expect(html).toContain('আপনার পড়াশোনা ও ক্লাস মনিটরিং');
      // Verify child content is rendered inside main page
      expect(html).toContain('Child content loaded');
      // Verify topbar has sticky class
      expect(html).toContain('sticky');
      expect(html).toContain('top-0');
    });
  });

  describe('Role-Separated Folder Routing Navigation', () => {
    it('provides role-scoped navigation routes for student', () => {
      const studentNav = navForRole('student');
      const hrefs = studentNav.map((i) => i.href);
      expect(hrefs).toContain('/dashboard/student');
      expect(hrefs).toContain('/dashboard/student/learning');
      expect(hrefs).toContain('/dashboard/student/sessions');
      expect(hrefs).toContain('/dashboard/student/requests');
      expect(hrefs).toContain('/dashboard/student/payments');
    });

    it('provides role-scoped navigation routes for tutor', () => {
      const tutorNav = navForRole('tutor');
      const hrefs = tutorNav.map((i) => i.href);
      expect(hrefs).toContain('/dashboard/tutor');
      expect(hrefs).toContain('/dashboard/tutor/requests');
      expect(hrefs).toContain('/dashboard/tutor/sessions');
      expect(hrefs).toContain('/dashboard/tutor/learning');
      expect(hrefs).toContain('/dashboard/tutor/payments');
      expect(hrefs).toContain('/dashboard/tutor/verification');
    });

    it('provides role-scoped navigation routes for guardian', () => {
      const guardianNav = navForRole('guardian');
      const hrefs = guardianNav.map((i) => i.href);
      expect(hrefs).toContain('/dashboard/guardian');
      expect(hrefs).toContain('/dashboard/guardian/children');
      expect(hrefs).toContain('/dashboard/guardian/requests');
      expect(hrefs).toContain('/dashboard/guardian/sessions');
      expect(hrefs).toContain('/dashboard/guardian/learning');
      expect(hrefs).toContain('/dashboard/guardian/payments');
    });

    it('provides role-scoped navigation routes for admin', () => {
      const adminNav = navForRole('admin');
      const hrefs = adminNav.map((i) => i.href);
      expect(hrefs).toContain('/dashboard/admin');
      expect(hrefs).toContain('/dashboard/admin/analytics');
      expect(hrefs).toContain('/dashboard/admin/verification');
      expect(hrefs).toContain('/dashboard/admin/disputes');
      expect(hrefs).toContain('/dashboard/admin/users');
    });

    it('splits admin-family nav by the routes each role can actually open (F-7)', () => {
      // super_admin shares every /dashboard/admin/* gate with admin.
      const superAdminHrefs = navForRole('super_admin').map((i) => i.href);
      expect(superAdminHrefs).toContain('/dashboard/admin');
      expect(superAdminHrefs).toContain('/dashboard/admin/users');
      expect(superAdminHrefs).toContain('/admin?tab=audit');

      // support_agent / compliance_reviewer fail the /dashboard/admin/* gate
      // (admin + super_admin only), so their nav must not offer those routes —
      // only the /admin console surface they can open.
      for (const role of ['support_agent', 'compliance_reviewer'] as const) {
        const items = navForRole(role);
        expect(items.map((i) => i.href)).toEqual(['/admin']);
      }
    });
  });
});
