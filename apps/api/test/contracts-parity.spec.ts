import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  SearchTutorsQuerySchema,
  GetMessagesQuerySchema,
  OffsetQuerySchema,
  CursorQuerySchema,
  GetNotificationsQuerySchema,
  resolveTutorSearchPageSize,
  RegisterSchema,
  LoginSchema,
  RequestCodeSchema,
  VerifyCodeSchema,
  ResetPasswordSchema,
  RefreshTokenSchema,
  DeleteAccountSchema,
  UpdateProfileSchema,
  UpsertStudentProfileSchema,
  CreateBookingRequestSchema,
  RespondBookingRequestSchema,
  WithdrawBookingRequestSchema,
  CreateSessionSchema,
  CreateRecurringSessionsSchema,
  RescheduleSessionSchema,
  CancelSessionSchema,
  GetSessionsQuerySchema,
  MarkAttendanceSchema,
  CreateAssignmentSchema,
  SubmitAssignmentSchema,
  GradeSubmissionSchema,
  CreateProgressReportSchema,
  CreatePaymentOrderSchema,
  ProcessRefundSchema,
  SettleMilestoneSchema,
  LinkChildRequestSchema,
  RegisterChildSchema,
  VerifyLinkSchema,
  RevokeLinkSchema,
  CreateReviewSchema,
  CreateSafetyReportSchema,
  CreateReplacementCaseSchema,
  ModerateReviewSchema,
  TutorReplySchema,
  UpdateSafetyReportSchema,
  UpdateReplacementCaseSchema,
  CreateSupportTicketSchema,
  UpdateSupportTicketSchema,
  SuspendUserSchema,
  AdminCancelBookingSchema,
  UpdateUserRolesSchema,
  AssignSupportCaseSchema,
  StartImpersonationSchema,
  QueryAuditLogsSchema,
  AnalyticsTimeQuerySchema,
  UploadEvidenceSchema,
} from '@ogroniedu/contracts';
import { SearchTutorsQueryDto } from '../src/modules/tutors/dto/search-tutors-query.dto';
import { GetMessagesQueryDto } from '../src/modules/notifications/dto/get-messages-query.dto';
import {
  GetNotificationsQueryDto,
  resolveNotificationsOffsetLimit,
} from '../src/modules/notifications/dto/get-notifications-query.dto';

/**
 * Cross-stack parity: zod schemas in @ogroniedu/contracts vs backend
 * class-validator DTOs (Phase 23 P1-2). Any default/bound rename must update
 * both sides — these tests fail loudly instead of drifting silently.
 */
describe('contracts parity (zod ↔ class-validator)', () => {
  describe('tutor search', () => {
    it('zod and class DTO agree on defaults and bounds', async () => {
      const zodDefaults = SearchTutorsQuerySchema.parse({});
      expect(zodDefaults.page).toBe(1);
      expect(zodDefaults.limit).toBe(10);
      expect(zodDefaults.sort).toBe('recommended');

      const classDefaults = plainToInstance(SearchTutorsQueryDto, {});
      expect(classDefaults.page).toBe(1);
      expect(classDefaults.limit).toBe(10);
      expect(classDefaults.sort).toBe('recommended');
      expect(await validate(classDefaults)).toHaveLength(0);
    });

    it('both reject unknown sort/mode and oversized pages', async () => {
      expect(() => SearchTutorsQuerySchema.parse({ sort: 'hacked' })).toThrow();
      expect(() => SearchTutorsQuerySchema.parse({ mode: 'telepathy' })).toThrow();
      const over = plainToInstance(SearchTutorsQueryDto, { limit: 500 });
      expect((await validate(over)).length).toBeGreaterThan(0);
    });

    it('shared resolver matches on both stacks', () => {
      expect(resolveTutorSearchPageSize({ limit: 5, pageSize: 15 })).toBe(15);
      expect(resolveTutorSearchPageSize({ limit: 999 })).toBe(50);
    });
  });

  describe('booking messages query', () => {
    it('zod default pageSize 50 matches the class DTO default', async () => {
      expect(GetMessagesQuerySchema.parse({}).pageSize).toBe(50);
      const dto = plainToInstance(GetMessagesQueryDto, {});
      expect(dto.pageSize).toBe(50);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('both enforce the 1-100 bound', async () => {
      expect(() => GetMessagesQuerySchema.parse({ pageSize: 500 })).toThrow();
      const over = plainToInstance(GetMessagesQueryDto, { pageSize: 500 });
      expect((await validate(over)).length).toBeGreaterThan(0);
    });
  });

  describe('notifications query', () => {
    it('zod and class DTO agree on offset defaults', async () => {
      const zod = GetNotificationsQuerySchema.parse({});
      expect(zod.limit).toBe(20);
      expect(zod.page).toBe(1);
      const dto = plainToInstance(GetNotificationsQueryDto, {});
      expect(dto.limit).toBe(20);
      expect(dto.page).toBe(1);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('offset resolver prefers canonical pageSize', () => {
      expect(resolveNotificationsOffsetLimit({ limit: 5, pageSize: 15 })).toBe(15);
      expect(resolveNotificationsOffsetLimit({ limit: 5 })).toBe(5);
    });
  });

  describe('canonical offset/cursor shapes', () => {
    it('offset defaults to page 1 × 20 desc; cursor defaults to 20 next', () => {
      expect(OffsetQuerySchema.parse({})).toMatchObject({
        page: 1,
        pageSize: 20,
        sortOrder: 'desc',
      });
      expect(CursorQuerySchema.parse({})).toMatchObject({ pageSize: 20, direction: 'next' });
    });
  });

  describe('domain schemas accept valid payloads and reject bad ones (P1-2b)', () => {
    const UUID = '11111111-1111-4111-8111-111111111111';
    const cases: Array<[string, { parse: (v: unknown) => unknown }, unknown, unknown]> = [
      [
        'register',
        RegisterSchema,
        { displayName: 'Rahim', phone: '+8801712345678', password: 'Abcdef12', role: 'student' },
        { displayName: 'R', password: 'short', role: 'super_admin' },
      ],
      ['login', LoginSchema, { identifier: 'rahim@x.com', password: 'x' }, { identifier: 'ab' }],
      [
        'update-profile',
        UpdateProfileSchema,
        { displayName: 'Karim', preferredLocale: 'en' },
        { preferredLocale: 'fr' },
      ],
      [
        'upsert-student-profile',
        UpsertStudentProfileSchema,
        { dateOfBirth: '2015-03-01', profileVisibility: 'limited' },
        { dateOfBirth: '03/01/2015' },
      ],
      [
        'create-booking-request',
        CreateBookingRequestSchema,
        { tutorId: UUID, studentId: UUID, subjectId: UUID, educationLevelId: UUID, mode: 'online' },
        { tutorId: UUID, studentId: UUID, subjectId: UUID, educationLevelId: UUID, mode: 'sms' },
      ],
      [
        'respond-booking-request',
        RespondBookingRequestSchema,
        { action: 'accept' },
        { action: 'maybe' },
      ],
      ['withdraw-booking-request', WithdrawBookingRequestSchema, {}, { reason: 42 }],
      [
        'create-session',
        CreateSessionSchema,
        { bookingId: UUID, startsAt: '2026-11-01T10:00:00Z' },
        { bookingId: UUID, startsAt: 'tomorrow' },
      ],
      [
        'reschedule-session',
        RescheduleSessionSchema,
        { newStartsAt: '2026-11-02T10:00:00Z', reason: 'Schedule change' },
        { newStartsAt: '2026-11-02T10:00:00Z', reason: 'busy' },
      ],
      ['cancel-session', CancelSessionSchema, { reason: 'No longer needed' }, { reason: 'x' }],
      ['get-sessions-query', GetSessionsQuerySchema, { status: 'scheduled' }, { status: 'soon' }],
      [
        'mark-attendance',
        MarkAttendanceSchema,
        { sessionId: UUID, participantUserId: UUID, attendanceStatus: 'present' },
        { sessionId: UUID, participantUserId: UUID, attendanceStatus: 'sleeping' },
      ],
      [
        'create-assignment',
        CreateAssignmentSchema,
        { bookingId: UUID, title: 'Algebra homework' },
        { bookingId: UUID, title: 'AB' },
      ],
      ['submit-assignment', SubmitAssignmentSchema, {}, { assetIds: ['nope'] }],
      ['grade-submission', GradeSubmissionSchema, { score: 85 }, { score: 5000 }],
      [
        'create-progress-report',
        CreateProgressReportSchema,
        {
          bookingId: UUID,
          periodStart: '2026-10-01T00:00:00Z',
          periodEnd: '2026-10-31T00:00:00Z',
          observableProgress: 'Steady gains in algebra',
        },
        { bookingId: UUID, periodStart: 'x', periodEnd: 'y', observableProgress: 'ok' },
      ],
      [
        'create-payment-order',
        CreatePaymentOrderSchema,
        { bookingId: UUID, provider: 'bkash' },
        { bookingId: UUID, provider: 'cash' },
      ],
      [
        'process-refund',
        ProcessRefundSchema,
        { paymentOrderId: UUID, amountMinor: 50000, reason: 'Session cancelled' },
        { paymentOrderId: UUID, amountMinor: 50, reason: 'Session cancelled' },
      ],
      [
        'link-child-request',
        LinkChildRequestSchema,
        {
          studentIdentifier: '01911111111',
          relationshipType: 'father',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed: true,
        },
        {
          studentIdentifier: '01911111111',
          relationshipType: 'uncle',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed: true,
        },
      ],
      [
        'register-child',
        RegisterChildSchema,
        {
          displayName: 'Mim',
          relationshipType: 'mother',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed: true,
        },
        {
          displayName: 'Mim',
          relationshipType: 'mother',
          consentPolicyVersion: 'v1.0-bd-minor-consent',
          consentAgreed: false,
        },
      ],
      ['verify-link', VerifyLinkSchema, { decision: 'approve' }, { decision: 'maybe' }],
      ['revoke-link', RevokeLinkSchema, {}, { reason: 7 }],
      [
        'request-code',
        RequestCodeSchema,
        { contact: '01911111111', purpose: 'password_recovery' },
        { contact: '01', purpose: 'password_recovery' },
      ],
      [
        'verify-code',
        VerifyCodeSchema,
        { contact: '01911111111', code: '123456', purpose: 'contact_verification' },
        { contact: '01911111111', code: '12345', purpose: 'contact_verification' },
      ],
      [
        'reset-password',
        ResetPasswordSchema,
        { contact: '01911111111', code: '123456', newPassword: 'Abcdef12' },
        { contact: '01911111111', code: '123456', newPassword: 'weak' },
      ],
      [
        'delete-account',
        DeleteAccountSchema,
        { confirmationText: 'DELETE' },
        { confirmationText: 'delete' },
      ],
      [
        'create-review',
        CreateReviewSchema,
        { bookingId: UUID, rating: 5, comment: 'Excellent tutor' },
        { bookingId: UUID, rating: 9, comment: 'Excellent tutor' },
      ],
      [
        'create-safety-report',
        CreateSafetyReportSchema,
        { category: 'fraud_billing', description: 'Charged for a class that never happened' },
        { category: 'spam', description: 'Charged for a class that never happened' },
      ],
      [
        'create-replacement-case',
        CreateReplacementCaseSchema,
        { bookingId: UUID, reasonCode: 'tutor_no_show', explanation: 'Missed twice' },
        { bookingId: UUID, reasonCode: 'bad_vibes', explanation: 'Missed twice' },
      ],
      [
        'moderate-review',
        ModerateReviewSchema,
        { status: 'flagged', reason: 'Spam' },
        { status: 'deleted' },
      ],
      ['tutor-reply', TutorReplySchema, { reply: 'Thank you for the feedback' }, { reply: '' }],
      [
        'update-safety-report',
        UpdateSafetyReportSchema,
        { status: 'escalated', escalationLevel: 'urgent_child_safety' },
        { status: 'closed', escalationLevel: 'urgent_child_safety' },
      ],
      [
        'update-replacement-case',
        UpdateReplacementCaseSchema,
        { status: 'offered', replacementTutorUserId: UUID },
        { status: 'offered', replacementTutorUserId: 'nope' },
      ],
      [
        'assign-support-case',
        AssignSupportCaseSchema,
        { assignedToUserId: UUID, caseType: 'safety', caseId: UUID },
        { assignedToUserId: UUID, caseType: 'billing', caseId: UUID },
      ],
      [
        'start-impersonation',
        StartImpersonationSchema,
        { targetUserId: UUID, reason: 'Debugging checkout issue' },
        { targetUserId: UUID, reason: 'Debugging checkout issue', durationMinutes: 99 },
      ],
      ['refresh-token', RefreshTokenSchema, {}, { refreshToken: 42 }],
      ['settle-milestone', SettleMilestoneSchema, { sessionId: UUID }, { sessionId: 'nope' }],
      [
        'admin-cancel-booking',
        AdminCancelBookingSchema,
        { reason: 'Tutor misconduct verified' },
        { reason: 'x' },
      ],
      [
        'create-recurring-sessions',
        CreateRecurringSessionsSchema,
        {
          bookingId: UUID,
          startDate: '2026-11-01',
          scheduleSlots: [{ weekday: 0, startLocal: '15:00' }],
        },
        {
          bookingId: UUID,
          startDate: '2026-11-01',
          scheduleSlots: [{ weekday: 9, startLocal: '25:00' }],
        },
      ],
      [
        'create-support-ticket',
        CreateSupportTicketSchema,
        { name: 'Rahim', email: 'r@x.com', message: 'Need help with payment flow' },
        { name: 'R', email: 'r@x.com', message: 'Need help with payment flow' },
      ],
      [
        'update-support-ticket',
        UpdateSupportTicketSchema,
        { status: 'resolved' },
        { status: 'done' },
      ],
      [
        'suspend-user',
        SuspendUserSchema,
        { reason: 'Fraudulent identity claims' },
        { reason: 'x' },
      ],
      ['update-user-roles', UpdateUserRolesSchema, { roles: ['support_agent'] }, { roles: [] }],
      ['query-audit-logs', QueryAuditLogsSchema, {}, { limit: 500 }],
      ['analytics-time-query', AnalyticsTimeQuerySchema, {}, { granularity: 'year' }],
      [
        'upload-evidence',
        UploadEvidenceSchema,
        {
          purpose: 'nid',
          originalFilename: 'nid.jpg',
          mediaType: 'image/jpeg',
          sizeBytes: 1024,
        },
        {
          purpose: 'passport',
          originalFilename: 'nid.jpg',
          mediaType: 'image/jpeg',
          sizeBytes: 1024,
        },
      ],
    ];

    it.each(cases.map(([name]) => name))('%s schema pins the contract', (name) => {
      const entry = cases.find(([n]) => n === name);
      const [, schema, valid, invalid] = entry as (typeof cases)[number];
      expect(() => schema.parse(valid)).not.toThrow();
      expect(() => schema.parse(invalid)).toThrow();
    });

    it('support ticket defaults to general; audit logs default to 50/0; analytics to day', () => {
      expect(
        CreateSupportTicketSchema.parse({ name: 'Ab', email: 'a@b.co', message: '0123456789' }),
      ).toMatchObject({ category: 'general' });
      expect(QueryAuditLogsSchema.parse({})).toMatchObject({ limit: 50, offset: 0 });
      expect(AnalyticsTimeQuerySchema.parse({})).toMatchObject({ granularity: 'day' });
    });
  });
});
