import { describe, it, expect } from 'vitest';
import { navSectionsForRole, navForRole } from '../src/lib/navigation';

describe('Phase 2 — Information Architecture & Navigation Matrix', () => {
  it('should generate valid categorized navigation sections for student', () => {
    const sections = navSectionsForRole('student');
    expect(sections.length).toBeGreaterThanOrEqual(3);
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain('/dashboard/student');
    expect(hrefs).toContain('/dashboard/student/learning');
    expect(hrefs).toContain('/dashboard/student/sessions');
  });

  it('should generate valid categorized navigation sections for guardian', () => {
    const sections = navSectionsForRole('guardian');
    expect(sections.length).toBeGreaterThanOrEqual(3);
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain('/dashboard/guardian');
    expect(hrefs).toContain('/dashboard/guardian/children');
    expect(hrefs).toContain('/dashboard/guardian/learning');
  });

  it('should generate valid categorized navigation sections for tutor', () => {
    const sections = navSectionsForRole('tutor');
    expect(sections.length).toBeGreaterThanOrEqual(3);
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain('/dashboard/tutor');
    expect(hrefs).toContain('/dashboard/tutor/sessions');
    expect(hrefs).toContain('/dashboard/tutor/payments');
  });

  it('should include tutor replacements in admin operations console', () => {
    const sections = navSectionsForRole('admin');
    const hrefs = sections.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain('/dashboard/admin/replacements');
    expect(hrefs).toContain('/dashboard/admin/verification');
    expect(hrefs).toContain('/dashboard/admin/users');
  });

  it('should provide specialized operational menus for support_agent and compliance_reviewer', () => {
    const supportSections = navSectionsForRole('support_agent');
    const supportHrefs = supportSections.flatMap((s) => s.items.map((i) => i.href));
    expect(supportHrefs).toContain('/dashboard/admin/bookings');
    expect(supportHrefs).toContain('/dashboard/admin/replacements');
    expect(supportHrefs).toContain('/dashboard/admin/users');

    const complianceSections = navSectionsForRole('compliance_reviewer');
    const complianceHrefs = complianceSections.flatMap((s) => s.items.map((i) => i.href));
    expect(complianceHrefs).toContain('/dashboard/admin/verification');
    expect(complianceHrefs).toContain('/dashboard/admin/audit-logs');
  });

  it('should ensure flat nav list contains all items from sections without duplicates', () => {
    const roles = [
      'student',
      'guardian',
      'tutor',
      'admin',
      'support_agent',
      'compliance_reviewer',
    ] as const;
    for (const role of roles) {
      const flatItems = navForRole(role);
      const hrefs = flatItems.map((i) => i.href);
      const uniqueHrefs = new Set(hrefs);
      expect(uniqueHrefs.size).toBe(hrefs.length);
    }
  });
});
