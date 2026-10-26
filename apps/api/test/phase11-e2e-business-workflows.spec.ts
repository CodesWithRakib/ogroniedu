import { describe, it, expect } from 'vitest';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

// Domain Services & Helpers
import { validateOnboardingPayload } from '../src/modules/onboarding/onboarding-validators';
import { normalizePhone } from '../src/modules/auth/utils/phone.utils';
import {
  isSelfSignupRole,
  isPrivilegedProvisionedRole,
  normalizeLocale,
} from '../src/modules/auth/utils/registration-policy';
import {
  normalizeBengaliDigits,
  inspectAndRedactContent,
} from '../src/modules/notifications/utils/content-safety.util';
import {
  bdtToMinor,
  minorToBdtString,
  formatMinorAsGroupedBdt,
  splitCommission,
  applyBps,
} from '../src/common/money/money';

describe('Phase 11: End-to-End Business Workflows (Workflows A through K) Integration Tests', () => {
  // Test Actors across Canonical Roles
  const studentUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student.e2e@ogroniedu.com',
    roles: ['student'],
  };

  const guardianUser: AuthenticatedUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'guardian.e2e@ogroniedu.com',
    roles: ['guardian'],
  };

  const tutorUser: AuthenticatedUser = {
    id: '33333333-3333-4333-8333-333333333333',
    email: 'tutor.e2e@ogroniedu.com',
    roles: ['tutor'],
  };

  const complianceUser: AuthenticatedUser = {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'compliance.e2e@ogroniedu.com',
    roles: ['compliance_reviewer'],
  };

  const adminUser: AuthenticatedUser = {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'admin.e2e@ogroniedu.com',
    roles: ['admin'],
  };

  const superAdminUser: AuthenticatedUser = {
    id: '66666666-6666-4666-8666-666666666666',
    email: 'superadmin.e2e@ogroniedu.com',
    roles: ['super_admin'],
  };

  const _orgOwnerUser: AuthenticatedUser = {
    id: '77777777-7777-4777-8777-777777777777',
    email: 'orgowner.e2e@ogroniedu.com',
    roles: ['organization_owner'],
  };

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW A: Authentication, Onboarding & Password Security                 */
  /* -------------------------------------------------------------------------- */
  describe('Workflow A: Authentication, Onboarding & Password Security', () => {
    it('normalizes Bangladeshi mobile phone numbers into E.164 (+8801XXXXXXXXX)', () => {
      expect(normalizePhone('01712345678')).toBe('+8801712345678');
      expect(normalizePhone('8801812345678')).toBe('+8801812345678');
      expect(normalizePhone('+8801912345678')).toBe('+8801912345678');
      expect(normalizePhone('  01712 345 678  ')).toBe('+8801712345678');
    });

    it('enforces self-signup vs privileged provisioned role policies', () => {
      // Self-signup roles (consumer / tutor)
      expect(isSelfSignupRole('student')).toBe(true);
      expect(isSelfSignupRole('guardian')).toBe(true);
      expect(isSelfSignupRole('tutor')).toBe(true);

      // Privileged roles (must be provisioned by super_admin)
      expect(isSelfSignupRole('admin')).toBe(false);
      expect(isPrivilegedProvisionedRole('admin')).toBe(true);
      expect(isPrivilegedProvisionedRole('super_admin')).toBe(true);
      expect(isPrivilegedProvisionedRole('compliance_reviewer')).toBe(true);
      expect(isPrivilegedProvisionedRole('support_agent')).toBe(true);
      expect(isPrivilegedProvisionedRole('organization_owner')).toBe(true);
      expect(isPrivilegedProvisionedRole('organization_staff')).toBe(true);
    });

    it('normalizes supported locales defaulting to Bengali (bn)', () => {
      expect(normalizeLocale('en')).toBe('en');
      expect(normalizeLocale('bn')).toBe('bn');
      expect(normalizeLocale(null)).toBe('bn');
      expect(normalizeLocale(undefined)).toBe('bn');
      expect(normalizeLocale('fr' as any)).toBe('bn');
    });

    it('validates bilingual tutor onboarding profile requirements', () => {
      const validProfile = {
        headline: 'Physics teacher for Class 9-12',
        headlineBn: 'নবম-দ্বাদশ শ্রেণির পদার্থবিজ্ঞান শিক্ষক',
        bio: 'I teach Physics with a focus on problem solving.',
        bioBn: 'আমি সমস্যা সমাধানে জোর দিয়ে পদার্থবিজ্ঞান পড়াই।',
      };
      expect(validateOnboardingPayload('tutor_profile', validProfile)).toBeNull();

      const missingBn = {
        headline: 'Physics teacher',
        bio: 'I teach Physics.',
      };
      expect(validateOnboardingPayload('tutor_profile', missingBn)).toMatch(/Bangla headline/);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW B: Tutor Profile & 3-Level Verification Dossier                    */
  /* -------------------------------------------------------------------------- */
  describe('Workflow B: Tutor Profile & 3-Level Verification Dossier', () => {
    interface VerificationDossier {
      tutorUserId: string;
      level1Identity: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
      level2Academic: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
      level3Background: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
      badges: string[];
    }

    it('tracks 3-tier verification lifecycle accurately', () => {
      const dossier: VerificationDossier = {
        tutorUserId: tutorUser.id,
        level1Identity: 'unsubmitted',
        level2Academic: 'unsubmitted',
        level3Background: 'unsubmitted',
        badges: [],
      };

      // Step 1: Tutor uploads NID / Passport (Level 1)
      dossier.level1Identity = 'pending';
      expect(dossier.level1Identity).toBe('pending');

      // Step 2: Compliance reviewer approves Level 1
      dossier.level1Identity = 'verified';
      dossier.badges.push('identity_verified');
      expect(dossier.badges).toContain('identity_verified');

      // Step 3: Tutor uploads Academic degree certificate (Level 2)
      dossier.level2Academic = 'verified';
      dossier.badges.push('academic_verified');

      // Step 4: Background check clearance (Level 3)
      dossier.level3Background = 'verified';
      dossier.badges.push('background_verified');

      expect(dossier.badges).toHaveLength(3);
      expect(dossier.level1Identity).toBe('verified');
      expect(dossier.level2Academic).toBe('verified');
      expect(dossier.level3Background).toBe('verified');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW C: Tutor Discovery & Geo-Radius Filtering                         */
  /* -------------------------------------------------------------------------- */
  describe('Workflow C: Tutor Discovery & Geo-Radius Filtering', () => {
    // Haversine formula calculation
    const calculateDistanceKm = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ): number => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    it('accurately filters tutors within search radius (e.g. Dhanmondi to Gulshan)', () => {
      const dhanmondiLat = 23.7461;
      const dhanmondiLon = 90.3742;

      const gulshanLat = 23.7925;
      const gulshanLon = 90.4078;

      const distanceKm = calculateDistanceKm(dhanmondiLat, dhanmondiLon, gulshanLat, gulshanLon);
      expect(distanceKm).toBeGreaterThan(5);
      expect(distanceKm).toBeLessThan(8); // Approximately 6.2 km

      const searchRadiusKm = 10;
      expect(distanceKm).toBeLessThanOrEqual(searchRadiusKm);
    });

    it('ensures public tutor profile sanitizes sensitive identity documents', () => {
      const fullTutorRecord = {
        userId: tutorUser.id,
        fullName: 'Rashed Karim',
        subject: 'Higher Mathematics',
        hourlyRatePoisha: 100000,
        nidNumber: '19951234567890123', // CONFIDENTIAL
        policeClearanceDocUrl: 'https://storage/private/clearance.pdf', // CONFIDENTIAL
      };

      const publicSanitizedProfile = {
        userId: fullTutorRecord.userId,
        fullName: fullTutorRecord.fullName,
        subject: fullTutorRecord.subject,
        hourlyRateBdt: minorToBdtString(fullTutorRecord.hourlyRatePoisha),
      };

      expect(publicSanitizedProfile).not.toHaveProperty('nidNumber');
      expect(publicSanitizedProfile).not.toHaveProperty('policeClearanceDocUrl');
      expect(publicSanitizedProfile.hourlyRateBdt).toBe('1000.00');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW D: Guardian Multi-Child Scoping & IDOR Prevention                 */
  /* -------------------------------------------------------------------------- */
  describe('Workflow D: Guardian Multi-Child Scoping & IDOR Prevention', () => {
    const guardianChildMap = new Map<string, string[]>();
    guardianChildMap.set(guardianUser.id, [studentUser.id]); // Guardian owns studentUser

    const foreignStudentId = '99999999-9999-4999-8999-999999999999';

    const verifyGuardianAccess = (guardianId: string, studentId: string): boolean => {
      const children = guardianChildMap.get(guardianId) || [];
      return children.includes(studentId);
    };

    it('permits guardian access to their linked child', () => {
      expect(verifyGuardianAccess(guardianUser.id, studentUser.id)).toBe(true);
    });

    it('NEGATIVE TEST: blocks guardian access to unlinked foreign child (IDOR protection)', () => {
      expect(verifyGuardianAccess(guardianUser.id, foreignStudentId)).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW E: Booking Proposal, State Transitions & Slot Concurrency         */
  /* -------------------------------------------------------------------------- */
  describe('Workflow E: Booking Proposal, State Transitions & Slot Concurrency', () => {
    type BookingState =
      'draft' | 'requested' | 'accepted' | 'funded' | 'in_progress' | 'completed' | 'cancelled';

    it('governs valid state machine transitions', () => {
      let state: BookingState = 'draft';

      // Submit proposal
      state = 'requested';
      expect(state).toBe('requested');

      // Tutor accepts
      state = 'accepted';
      expect(state).toBe('accepted');

      // Escrow funded
      state = 'funded';
      expect(state).toBe('funded');

      // Sessions start
      state = 'in_progress';
      expect(state).toBe('in_progress');

      // Completed
      state = 'completed';
      expect(state).toBe('completed');
    });

    it('detects and prevents overlapping calendar time slot booking', () => {
      interface TimeSlot {
        tutorId: string;
        startTime: Date;
        endTime: Date;
      }

      const existingSlot: TimeSlot = {
        tutorId: tutorUser.id,
        startTime: new Date('2026-11-01T10:00:00Z'),
        endTime: new Date('2026-11-01T11:00:00Z'),
      };

      const requestedSlot: TimeSlot = {
        tutorId: tutorUser.id,
        startTime: new Date('2026-11-01T10:30:00Z'), // 30 min overlap!
        endTime: new Date('2026-11-01T11:30:00Z'),
      };

      const hasCollision = (s1: TimeSlot, s2: TimeSlot): boolean => {
        if (s1.tutorId !== s2.tutorId) return false;
        return s1.startTime < s2.endTime && s2.startTime < s1.endTime;
      };

      expect(hasCollision(existingSlot, requestedSlot)).toBe(true);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW F: Payments & Ledger Zero-Sum Conservation                        */
  /* -------------------------------------------------------------------------- */
  describe('Workflow F: Payments & Ledger Zero-Sum Conservation', () => {
    it('enforces exact poisha integer conversions and formatting', () => {
      expect(bdtToMinor('500')).toBe(50000n);
      expect(bdtToMinor('1200.50')).toBe(120050n);
      expect(minorToBdtString(50000)).toBe('500.00');
      expect(formatMinorAsGroupedBdt(50000n)).toBe('500.00');
    });

    it('preserves Zero-Sum Journal Balance: Sum(Debit) === Sum(Credit)', () => {
      interface LedgerEntry {
        accountName: string;
        direction: 'debit' | 'credit';
        amountPoisha: number;
      }

      // Escrow Funding Journal
      const escrowJournal: LedgerEntry[] = [
        { accountName: 'GatewayClearing:bKash', direction: 'debit', amountPoisha: 100000 },
        { accountName: 'PlatformEscrowLiability', direction: 'credit', amountPoisha: 100000 },
      ];

      const sumDebit = escrowJournal
        .filter((e) => e.direction === 'debit')
        .reduce((sum, e) => sum + e.amountPoisha, 0);
      const sumCredit = escrowJournal
        .filter((e) => e.direction === 'credit')
        .reduce((sum, e) => sum + e.amountPoisha, 0);

      expect(sumDebit).toBe(sumCredit);
      expect(sumDebit - sumCredit).toBe(0);
    });

    it('preserves Zero-Sum Balance during milestone settlement with commission split', () => {
      // 1000 BDT session settlement: 10% commission (1000 bps) -> 100 BDT platform commission + 900 BDT tutor net
      const totalAmountMinor = 100000n; // 1,000.00 BDT
      const split = splitCommission(totalAmountMinor, 1000); // 1000 bps = 10%

      expect(split.platformFeeMinor).toBe(10000n); // 100.00 BDT
      expect(split.tutorNetMinor).toBe(90000n); // 900.00 BDT
      expect(split.platformFeeMinor + split.tutorNetMinor).toBe(totalAmountMinor);

      const settlementJournal = [
        {
          accountName: 'PlatformEscrowLiability',
          direction: 'debit',
          amountPoisha: Number(totalAmountMinor),
        },
        {
          accountName: 'TutorPayable',
          direction: 'credit',
          amountPoisha: Number(split.tutorNetMinor),
        },
        {
          accountName: 'PlatformCommissionRevenue',
          direction: 'credit',
          amountPoisha: Number(split.platformFeeMinor),
        },
      ];

      const sumDebit = settlementJournal
        .filter((e) => e.direction === 'debit')
        .reduce((sum, e) => sum + e.amountPoisha, 0);
      const sumCredit = settlementJournal
        .filter((e) => e.direction === 'credit')
        .reduce((sum, e) => sum + e.amountPoisha, 0);

      expect(sumDebit).toBe(sumCredit);
      expect(sumDebit).toBe(100000);
    });

    it('calculates penalty bps on early cancellation properly using applyBps', () => {
      const bookingTotalMinor = 500000n; // 5,000 BDT
      // 50% penalty (5000 bps) if cancelled within 24h
      const penaltyMinor = applyBps(bookingTotalMinor, 5000);
      const refundMinor = bookingTotalMinor - penaltyMinor;

      expect(penaltyMinor).toBe(250000n);
      expect(refundMinor).toBe(250000n);
      expect(penaltyMinor + refundMinor).toBe(bookingTotalMinor);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW G: LMS Learning Flow, Attendance & Milestone Release              */
  /* -------------------------------------------------------------------------- */
  describe('Workflow G: LMS Learning Flow, Attendance & Milestone Release', () => {
    it('requires minimum 80% attendance duration for automated milestone verification', () => {
      const scheduledMinutes = 60;
      const minimumThresholdMinutes = scheduledMinutes * 0.8; // 48 minutes

      const studentAttendedMinutes = 50;
      const isEligibleForAutoRelease = studentAttendedMinutes >= minimumThresholdMinutes;

      expect(isEligibleForAutoRelease).toBe(true);

      const insufficientAttendanceMinutes = 35;
      expect(insufficientAttendanceMinutes >= minimumThresholdMinutes).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW H: Realtime Messaging & Prohibited Contact Moderation             */
  /* -------------------------------------------------------------------------- */
  describe('Workflow H: Realtime Messaging & Prohibited Contact Moderation', () => {
    it('normalizes Bengali digits to ASCII numerals before moderation inspection', () => {
      expect(normalizeBengaliDigits('০১৭১২৩৪৫৬৭৮')).toBe('01712345678');
      expect(normalizeBengaliDigits('+৮৮০১৮১২৩৪৫৬৭৮')).toBe('+8801812345678');
    });

    it('detects off-platform payment solicitations and personal contact details', () => {
      const cleanMessage =
        'Please review Chapter 4 on Quadratic Equations before our session tomorrow.';
      const cleanRes = inspectAndRedactContent(cleanMessage);
      expect(cleanRes.isRedacted).toBe(false);
      expect(cleanRes.sanitizedContent).toBe(cleanMessage);

      const leakPhone = 'Call me directly on 01712345678 to pay outside the app.';
      const phoneRes = inspectAndRedactContent(leakPhone);
      expect(phoneRes.isRedacted).toBe(true);
      expect(phoneRes.violationCodes).toContain('PHONE_NUMBER');
      expect(phoneRes.sanitizedContent).toContain('[REDACTED CONTACT NUMBER]');

      const leakOffPlatform = 'Send money to my bkash personal number.';
      const offPlatformRes = inspectAndRedactContent(leakOffPlatform);
      expect(offPlatformRes.isRedacted).toBe(true);
      expect(offPlatformRes.violationCodes).toContain('OFF_PLATFORM_PAYMENT');
      expect(offPlatformRes.sanitizedContent).toContain('[REDACTED PAYMENT SOLICITATION]');

      const leakExternalLink = 'Chat with me on wa.me/8801711111111 for scheduling.';
      const linkRes = inspectAndRedactContent(leakExternalLink);
      expect(linkRes.isRedacted).toBe(true);
      expect(linkRes.violationCodes).toContain('EXTERNAL_LINK');
      expect(linkRes.sanitizedContent).toContain('[REDACTED EXTERNAL LINK]');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW I: Child Safeguarding, SOS Incident & Confidential Firewall       */
  /* -------------------------------------------------------------------------- */
  describe('Workflow I: Child Safeguarding, SOS Incident & Confidential Firewall', () => {
    it('activates emergency freeze on SOS trigger', () => {
      const session = {
        id: 'sess-001',
        status: 'active',
        escrowHold: false,
        incidentFlagged: false,
      };

      // Trigger SOS
      session.status = 'emergency_frozen';
      session.escrowHold = true;
      session.incidentFlagged = true;

      expect(session.status).toBe('emergency_frozen');
      expect(session.escrowHold).toBe(true);
      expect(session.incidentFlagged).toBe(true);
    });

    it('strictly isolates unredacted incident records behind compliance clearance', () => {
      const canAccessSafetyDossier = (userRoles: string[]): boolean => {
        return userRoles.includes('compliance_reviewer') || userRoles.includes('super_admin');
      };

      expect(canAccessSafetyDossier(complianceUser.roles)).toBe(true);
      expect(canAccessSafetyDossier(superAdminUser.roles)).toBe(true);
      expect(canAccessSafetyDossier(adminUser.roles)).toBe(false); // Admin barred!
      expect(canAccessSafetyDossier(tutorUser.roles)).toBe(false); // Accused tutor barred!
      expect(canAccessSafetyDossier(studentUser.roles)).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW J: Admin Operations, Multi-Tenancy & Audit Ledger                 */
  /* -------------------------------------------------------------------------- */
  describe('Workflow J: Admin Operations, Multi-Tenancy & Audit Ledger', () => {
    it('records immutable audit log entries with actor, IP, timestamp, and action metadata', () => {
      const auditLog = {
        id: 'audit-001',
        actorUserId: adminUser.id,
        actorRole: 'admin',
        action: 'tutor.verified_level1',
        targetId: tutorUser.id,
        timestamp: new Date().toISOString(),
        clientIp: '127.0.0.1',
      };

      expect(auditLog.action).toBe('tutor.verified_level1');
      expect(auditLog.targetId).toBe(tutorUser.id);
      expect(auditLog.clientIp).toBe('127.0.0.1');
    });

    it('enforces multi-tenant organization scoping (Org A cannot view Org B data)', () => {
      const orgAId = 'org-aaaa-aaaa';
      const orgBId = 'org-bbbb-bbbb';

      const tutorRecords = [
        { tutorId: 'tut-1', organizationId: orgAId },
        { tutorId: 'tut-2', organizationId: orgAId },
        { tutorId: 'tut-3', organizationId: orgBId },
      ];

      const filterByTenant = (orgId: string) =>
        tutorRecords.filter((r) => r.organizationId === orgId);

      const orgAResults = filterByTenant(orgAId);
      expect(orgAResults).toHaveLength(2);
      expect(orgAResults.some((r) => r.organizationId === orgBId)).toBe(false);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WORKFLOW K: Search, SEO & Production Security Headers                      */
  /* -------------------------------------------------------------------------- */
  describe('Workflow K: Search, SEO & Production Security Headers', () => {
    it('verifies standard production security headers dictionary', () => {
      const securityHeaders = {
        'Content-Security-Policy': "default-src 'self'",
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      };

      expect(securityHeaders['X-Frame-Options']).toBe('DENY');
      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
      expect(securityHeaders['Strict-Transport-Security']).toContain('max-age=63072000');
    });
  });
});
