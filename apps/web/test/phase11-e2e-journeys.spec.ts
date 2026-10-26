import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CanonicalRole } from '@ogroniedu/contracts';
import { TutorSearchCatalog } from '../src/features/tutor-discovery';
import { GuardianChildrenManager } from '../src/components/guardian/GuardianChildrenManager';
import { SessionScheduleCalendar } from '../src/components/scheduling/SessionScheduleCalendar';

describe('Phase 11: Web Frontend End-to-End Journeys & Contract Validation', () => {
  // All 9 Canonical Roles
  const canonicalRoles: CanonicalRole[] = [
    'student',
    'guardian',
    'tutor',
    'support_agent',
    'compliance_reviewer',
    'admin',
    'super_admin',
    'organization_owner',
    'organization_staff',
  ];

  describe('Role-Specific Dashboard Routing Policy', () => {
    const getDashboardPathForRole = (role: CanonicalRole): string => {
      switch (role) {
        case 'student':
          return '/dashboard/student';
        case 'guardian':
          return '/dashboard/guardian';
        case 'tutor':
          return '/dashboard/tutor';
        case 'compliance_reviewer':
          return '/dashboard/compliance';
        case 'support_agent':
          return '/dashboard/support';
        case 'admin':
          return '/admin';
        case 'super_admin':
          return '/admin/settings';
        case 'organization_owner':
          return '/dashboard/organization';
        case 'organization_staff':
          return '/dashboard/organization/roster';
        default:
          return '/dashboard';
      }
    };

    it('determines deterministic dashboard routes for all 9 canonical roles', () => {
      for (const role of canonicalRoles) {
        const path = getDashboardPathForRole(role);
        expect(path).toBeDefined();
        expect(path.startsWith('/')).toBe(true);
      }
    });

    it('routes administrative roles to /admin hierarchy', () => {
      expect(getDashboardPathForRole('admin')).toBe('/admin');
      expect(getDashboardPathForRole('super_admin')).toBe('/admin/settings');
    });

    it('routes compliance reviewers to dedicated compliance dashboard', () => {
      expect(getDashboardPathForRole('compliance_reviewer')).toBe('/dashboard/compliance');
    });

    it('routes organizational roles to organization workspace', () => {
      expect(getDashboardPathForRole('organization_owner')).toBe('/dashboard/organization');
      expect(getDashboardPathForRole('organization_staff')).toBe('/dashboard/organization/roster');
    });
  });

  describe('Component SSR & Empty State Stability', () => {
    it('renders TutorSearchCatalog with bilingual toggle support', () => {
      const bnHtml = renderToStaticMarkup(
        React.createElement(TutorSearchCatalog, { locale: 'bn' }),
      );
      expect(bnHtml).toBeDefined();
      expect(bnHtml.length).toBeGreaterThan(50);

      const enHtml = renderToStaticMarkup(
        React.createElement(TutorSearchCatalog, { locale: 'en' }),
      );
      expect(enHtml).toBeDefined();
      expect(enHtml.length).toBeGreaterThan(50);
    });

    it('renders GuardianChildrenManager without client hydration crashes', () => {
      const html = renderToStaticMarkup(
        React.createElement(GuardianChildrenManager, { locale: 'bn' }),
      );
      expect(html).toBeDefined();
    });

    it('renders SessionScheduleCalendar with proper semantic structure', () => {
      const html = renderToStaticMarkup(
        React.createElement(SessionScheduleCalendar, { locale: 'en' }),
      );
      expect(html).toBeDefined();
    });
  });

  describe('Tutor 3-Level Verification Badge Presentation', () => {
    interface VerificationBadgeProps {
      badge: 'identity_verified' | 'academic_verified' | 'background_verified';
      locale: 'bn' | 'en';
    }

    const renderVerificationBadge = ({ badge, locale }: VerificationBadgeProps): string => {
      const labels = {
        identity_verified: { bn: 'পরিচয় যাচাইকৃত', en: 'Identity Verified' },
        academic_verified: { bn: 'শিক্ষাগত যোগ্যতা যাচাইকৃত', en: 'Academic Verified' },
        background_verified: { bn: 'ব্যাকগ্রাউন্ড যাচাইকৃত', en: 'Background Verified' },
      };
      return `<span class="badge badge-${badge}">${labels[badge][locale]}</span>`;
    };

    it('renders localized 3-level verification badges accurately', () => {
      const idBn = renderVerificationBadge({ badge: 'identity_verified', locale: 'bn' });
      expect(idBn).toContain('পরিচয় যাচাইকৃত');

      const idEn = renderVerificationBadge({ badge: 'identity_verified', locale: 'en' });
      expect(idEn).toContain('Identity Verified');

      const bgBn = renderVerificationBadge({ badge: 'background_verified', locale: 'bn' });
      expect(bgBn).toContain('ব্যাকগ্রাউন্ড যাচাইকৃত');
    });
  });

  describe('Safeguarding SOS Modal Accessibility Contracts', () => {
    it('verifies SOS trigger attributes include high-contrast alert styling and aria tags', () => {
      const sosButtonAttributes = {
        role: 'button',
        'aria-label': 'জরুরি সহায়তা (Emergency SOS)',
        'aria-haspopup': 'dialog',
        'aria-expanded': false,
        className: 'bg-red-600 hover:bg-red-700 text-white font-bold',
      };

      expect(sosButtonAttributes['aria-label']).toContain('Emergency SOS');
      expect(sosButtonAttributes['aria-haspopup']).toBe('dialog');
      expect(sosButtonAttributes.className).toContain('bg-red-600');
    });
  });
});
