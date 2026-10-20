import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PaymentOrdersService } from '../src/modules/payments/services/payment-orders.service';
import { PaymentWebhooksService } from '../src/modules/payments/services/payment-webhooks.service';
import { RefundsService } from '../src/modules/payments/services/refunds.service';
import { SettlementService } from '../src/modules/payments/services/settlement.service';
import {
  PaymentOrderEntity,
  PaymentTransactionEntity,
  EscrowHoldEntity,
  SessionSettlementEntity,
  TutorFinancialAccountEntity,
} from '../src/modules/payments/entities';
import { BookingSessionEntity } from '../src/modules/bookings/entities/booking-session.entity';
import { LearningService } from '../src/modules/learning/learning.service';
import { LearningAccessService } from '../src/modules/learning/services/learning-access.service';
import { LearningAttendanceService } from '../src/modules/learning/services/attendance.service';
import { LearningAssignmentsService } from '../src/modules/learning/services/assignments.service';
import { LearningProgressService } from '../src/modules/learning/services/progress.service';
import { ReviewsService } from '../src/modules/trust/reviews.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { CreateBookingRequestDto } from '../src/modules/bookings/dto';
import { CreatePaymentOrderDto, SettleMilestoneDto } from '../src/modules/payments/dto';
import {
  CreateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
} from '../src/modules/learning/dto';
import { CreateReviewDto } from '../src/modules/trust/dto';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';

describe('Phase 18: Full End-to-End Tutoring Lifecycle Integration Tests', () => {
  // Test Actors
  const studentUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    roles: ['student'],
  };

  const tutorUser: AuthenticatedUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'tutor@example.com',
    roles: ['tutor'],
  };

  const _adminUser: AuthenticatedUser = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'admin@example.com',
    roles: ['admin', 'super_admin'],
  };

  // Mock State Store
  let sharedBooking: any;
  let sharedOrder: any;
  let sharedSession: any;
  let sharedAssignment: any;
  let sharedSubmission: any;

  // Services
  let bookingsService: BookingsService;
  let paymentsService: PaymentsService;
  let learningService: LearningService;
  let reviewsService: ReviewsService;

  beforeEach(() => {
    sharedOrder = undefined;

    sharedBooking = {
      id: '00000000-0000-4000-8000-000000000001',
      studentUserId: studentUser.id,
      requesterUserId: studentUser.id,
      tutorUserId: tutorUser.id,
      subjectId: 'sub-math-01',
      educationLevelId: 'level-hsc-01',
      mode: 'online',
      status: 'requested',
      pricePerSessionMinor: '60000',
      currency: 'BDT',
      durationMinutes: 60,
      serviceAgreementSnapshot: { hourlyRateMinor: '60000' },
      createdAt: new Date(),
    };

    sharedSession = {
      id: 'sess-0000-4000-8000-000000000001',
      bookingId: sharedBooking.id,
      sessionIndex: 1,
      tutorUserId: tutorUser.id,
      studentUserId: studentUser.id,
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 86400000 + 3600000),
      status: 'scheduled',
      payoutStatus: 'unpaid',
      amountMinor: '60000',
      booking: sharedBooking,
    };

    // 1. Bookings Service Mock Setup
    const mockBookingRepo: any = {
      findOne: vi.fn().mockImplementation(({ where }) => {
        if (where && where.id) {
          return Promise.resolve(sharedBooking);
        }
        return Promise.resolve(null);
      }),
      create: vi.fn((b) => ({ ...b, id: sharedBooking.id })),
      save: vi.fn(async (b) => {
        sharedBooking = { ...sharedBooking, ...b };
        return sharedBooking;
      }),
      createQueryBuilder: vi.fn(() => ({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([sharedBooking]),
      })),
    };

    const mockTutorProfileRepo: any = {
      findOne: vi.fn().mockResolvedValue({
        userId: tutorUser.id,
        publicationStatus: 'published',
        verificationStatus: 'approved',
      }),
    };

    const mockTutorSubjectRepo: any = {
      findOne: vi.fn().mockResolvedValue({
        tutorUserId: tutorUser.id,
        subjectId: 'sub-math-01',
        rateMinor: '60000',
      }),
    };

    const mockLinkRepo: any = {
      findOne: vi.fn().mockResolvedValue({
        status: 'active',
        guardianUserId: studentUser.id,
        studentUserId: studentUser.id,
      }),
      find: vi.fn().mockResolvedValue([]),
    };

    const mockUserRepo: any = {
      findOne: vi.fn().mockResolvedValue({ id: studentUser.id, displayName: 'Student One' }),
    };

    const mockSubjectRepo: any = {
      findOne: vi.fn().mockResolvedValue({ id: 'sub-math-01', name: 'Mathematics' }),
    };

    const mockLevelRepo: any = {
      findOne: vi.fn().mockResolvedValue({ id: 'level-hsc-01', name: 'HSC' }),
    };

    const mockAuditService: any = {
      record: vi.fn().mockResolvedValue({ id: 'audit-ok' }),
    };

    bookingsService = new BookingsService(
      mockBookingRepo,
      mockTutorProfileRepo,
      mockTutorSubjectRepo,
      mockLinkRepo,
      mockUserRepo,
      mockSubjectRepo,
      mockLevelRepo,
      mockAuditService,
      new GuardianAccessService(mockLinkRepo),
      undefined,
    );

    // 2. Payments Service Mock Setup
    const mockPaymentLedger: any = {
      postJournal: vi.fn().mockResolvedValue({ id: 'journal-e2e-1', entries: [] }),
    };

    const mockOrderRepo: any = {
      findOne: vi.fn().mockImplementation(({ where }) => {
        if (where?.id) return Promise.resolve(sharedOrder ?? null);
        return Promise.resolve(null);
      }),
      find: vi.fn(async () => (sharedOrder ? [sharedOrder] : [])),
      create: vi.fn((o) => {
        sharedOrder = {
          ...o,
          id: 'order-e2e-1',
          status: 'pending',
          booking: sharedBooking,
          payerUser: { id: studentUser.id, displayName: 'Student One' },
          updatedAt: new Date(),
          createdAt: new Date(),
        };
        return sharedOrder;
      }),
      save: vi.fn(async (o) => {
        sharedOrder = { ...sharedOrder, ...o, booking: sharedBooking };
        return sharedOrder;
      }),
    };

    const mockTxnRepo: any = {
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((t) => t),
      save: vi.fn((t) => Promise.resolve(t)),
    };

    const mockRefundRepo: any = {
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
    };
    const mockSessionRepo: any = {
      findOne: vi.fn().mockImplementation(() => Promise.resolve(sharedSession)),
      find: vi.fn().mockResolvedValue([sharedSession]),
      save: vi.fn(async (s) => {
        sharedSession = { ...sharedSession, ...s };
        return sharedSession;
      }),
    };

    const mockAdapter = {
      providerName: 'bkash',
      createCheckoutSession: vi.fn().mockResolvedValue({
        checkoutUrl: 'https://sandbox.payment.bkash.com/checkout?token=e2e-token',
        providerOrderId: 'PROV-ORD-E2E-1',
      }),
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      normalizeWebhook: vi.fn(() => ({
        eventId: 'EVT-BKASH-E2E-999',
        eventType: 'bkash.succeeded',
        orderReference: sharedOrder.id,
        providerTransactionId: 'TRX-BKASH-E2E-999',
        amountMinor: '60000',
        currency: 'BDT',
        status: 'succeeded',
        rawStatus: 'COMPLETED',
      })),
      queryTransaction: vi.fn().mockResolvedValue({
        status: 'succeeded',
        amountMinor: 60000,
        currency: 'BDT',
        providerTransactionId: 'TRX-BKASH-E2E-999',
        verifiedAt: new Date(),
      }),
      processRefund: vi.fn().mockResolvedValue({
        status: 'unsupported',
        providerRefundId: null,
        amountMinor: 0,
      }),
    };

    const mockAdapterFactory = {
      getAdapter: vi.fn().mockReturnValue(mockAdapter),
    };

    const mockWebhookRepo: any = {
      create: vi.fn((e) => e),
      save: vi.fn(async (e) => ({ id: 'webhook-e2e-1', ...e })),
      update: vi.fn().mockResolvedValue({}),
      findOne: vi.fn(),
    };

    const mockOutboxRepo: any = {
      create: vi.fn((e) => e),
      save: vi.fn((e) => Promise.resolve(e)),
    };

    const escrowHold: any = {
      id: 'hold-e2e-1',
      paymentOrderId: 'order-e2e-1',
      bookingId: sharedBooking.id,
      payerUserId: studentUser.id,
      tutorUserId: tutorUser.id,
      amountMinor: '60000',
      releasedMinor: '0',
      refundedMinor: '0',
      currency: 'BDT',
      commissionRateBps: 800,
      commissionPolicyId: 'policy-1',
      status: 'held',
      heldAt: new Date(),
    };

    const holdBuilder = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      setLock: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(escrowHold),
    };
    const insertBuilder = {
      insert: vi.fn().mockReturnThis(),
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      orIgnore: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({}),
    };

    const mockDataSource: any = {
      transaction: vi.fn(async (cb) => {
        const manager: any = {
          findOne: vi.fn(async (entity) => {
            if (entity === PaymentOrderEntity) return sharedOrder ?? null;
            if (entity === PaymentTransactionEntity) return null;
            if (entity === EscrowHoldEntity) return null;
            if (entity === BookingSessionEntity) return sharedSession;
            if (entity === SessionSettlementEntity) return null;
            if (entity === TutorFinancialAccountEntity) {
              return { tutorUserId: tutorUser.id, reservedMinor: '0' };
            }
            return null;
          }),
          createQueryBuilder: vi
            .fn()
            .mockReturnValueOnce(holdBuilder)
            .mockReturnValueOnce(insertBuilder),
          create: vi.fn((entity, x) => ({
            ...x,
            id:
              entity === EscrowHoldEntity
                ? 'hold-e2e-1'
                : entity === SessionSettlementEntity
                  ? 'settlement-e2e-1'
                  : 'created-id-1',
          })),
          save: vi.fn((x) => Promise.resolve(x)),
          update: vi.fn().mockResolvedValue({}),
        };
        return await cb(manager);
      }),
    };

    const mockCommissionPolicy: any = {
      getActivePolicy: vi.fn().mockResolvedValue({
        id: 'policy-1',
        version: 1,
        platformFeeBps: 800,
        minPayoutMinor: '50000',
      }),
    };
    const mockInvoiceService: any = {
      createForOrder: vi.fn().mockResolvedValue({
        id: 'invoice-e2e-1',
        invoiceNumber: 'INV-2026-000001',
      }),
      getInvoiceForOrder: vi.fn().mockResolvedValue(null),
    };

    paymentsService = new PaymentsService(
      new PaymentOrdersService(
        mockOrderRepo,
        mockBookingRepo,
        new GuardianAccessService(mockLinkRepo),
        mockAdapterFactory as any,
        mockAuditService,
        mockCommissionPolicy,
        mockInvoiceService,
      ) as never,
      new PaymentWebhooksService(
        mockOrderRepo,
        mockTxnRepo,
        mockWebhookRepo,
        new GuardianAccessService(mockLinkRepo),
        mockPaymentLedger,
        mockAdapterFactory as any,
        mockInvoiceService,
        mockAuditService,
        mockDataSource,
        undefined,
      ) as never,
      new RefundsService(
        mockOrderRepo,
        mockRefundRepo,
        mockTxnRepo,
        { findOne: vi.fn() } as never,
        mockOutboxRepo,
        mockPaymentLedger,
        mockAdapterFactory as any,
        mockAuditService,
        new GuardianAccessService(mockLinkRepo),
        mockDataSource,
        undefined,
      ) as never,
      new SettlementService(
        mockSessionRepo,
        mockOrderRepo,
        mockTxnRepo,
        { find: vi.fn() } as never,
        { findOne: vi.fn() } as never,
        mockRefundRepo,
        { find: vi.fn() } as never,
        { create: vi.fn(), save: vi.fn() } as never,
        mockPaymentLedger,
        mockAuditService,
        mockDataSource,
        undefined,
      ) as never,
      {} as never,
    );

    // 4. Learning Service Mock Setup
    const mockAttendanceRepo: any = {
      create: vi.fn((a) => a),
      save: vi.fn((a) => Promise.resolve({ ...a, id: 'att-1' })),
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    const mockAssignmentRepo: any = {
      create: vi.fn((a) => {
        sharedAssignment = { ...a, id: 'assign-e2e-1', maxScore: 100, createdAt: new Date() };
        return sharedAssignment;
      }),
      save: vi.fn((a) => Promise.resolve(a)),
      findOne: vi.fn().mockImplementation(() => Promise.resolve(sharedAssignment)),
      find: vi.fn().mockResolvedValue([]),
    };

    const mockSubmissionRepo: any = {
      create: vi.fn((s) => {
        sharedSubmission = {
          ...s,
          id: 'subm-e2e-1',
          status: 'submitted',
          score: null,
          assignment: sharedAssignment,
          createdAt: new Date(),
        };
        return sharedSubmission;
      }),
      save: vi.fn(async (s) => {
        sharedSubmission = { ...sharedSubmission, ...s, assignment: sharedAssignment };
        return sharedSubmission;
      }),
      findOne: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ score: null, ...sharedSubmission, assignment: sharedAssignment }),
        ),
      find: vi.fn().mockResolvedValue([]),
    };

    const mockProgressRepo: any = {
      create: vi.fn((p) => p),
      save: vi.fn((p) => Promise.resolve(p)),
      find: vi.fn().mockResolvedValue([]),
    };

    const access = new LearningAccessService(
      mockBookingRepo,
      new GuardianAccessService(mockLinkRepo),
    ) as never;
    learningService = new LearningService(
      access,
      new LearningAttendanceService(
        mockAttendanceRepo,
        mockSessionRepo,
        new GuardianAccessService(mockLinkRepo),
        access,
        mockAuditService,
      ) as never,
      new LearningAssignmentsService(
        mockAssignmentRepo,
        mockSubmissionRepo,
        mockBookingRepo,
        mockSessionRepo,
        new GuardianAccessService(mockLinkRepo),
        mockAuditService,
      ) as never,
      new LearningProgressService(
        mockProgressRepo,
        mockBookingRepo,
        mockSessionRepo,
        mockAttendanceRepo,
        mockAssignmentRepo,
        mockSubmissionRepo,
        access,
        mockAuditService,
      ) as never,
    );

    // 5. Reviews Service Mock Setup
    const mockReviewRepo: any = {
      create: vi.fn((r) => ({ ...r, id: 'rev-e2e-1', createdAt: new Date() })),
      save: vi.fn((r) => Promise.resolve(r)),
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
    };

    const mockReviewAuditRepo: any = {
      create: vi.fn((a) => a),
      save: vi.fn((a) => Promise.resolve({ id: 'audit-log-e2e-1', ...a })),
    };

    const mockNotificationService: any = {
      notify: vi.fn().mockResolvedValue({}),
      dispatch: vi.fn().mockResolvedValue({}),
    };

    reviewsService = new ReviewsService(
      mockReviewRepo,
      mockBookingRepo,
      mockOutboxRepo,
      mockReviewAuditRepo,
      mockNotificationService as any,
    );
  });

  it('STAGE 1: Student creates tutoring request, and tutor responds with acceptance', async () => {
    // 1. Student submits tutoring request
    const createDto: CreateBookingRequestDto = {
      studentId: studentUser.id,
      tutorId: tutorUser.id,
      subjectId: 'sub-math-01',
      educationLevelId: 'level-hsc-01',
      mode: 'online',
      messageNotes: 'Looking forward to calculus lessons.',
      preferredDays: [1, 3],
    };

    const createdBooking = await bookingsService.createRequest(studentUser, createDto);
    expect(createdBooking.status).toBe('requested');
    expect(createdBooking.pricePerSessionMinor).toBe('60000');

    // 2. Tutor responds with acceptance
    const acceptedBooking = await bookingsService.respondToRequest(sharedBooking.id, tutorUser, {
      action: 'accept',
    });
    expect(acceptedBooking.status).toBe('awaiting_payment');
  });

  it('STAGE 2: Student creates payment order, and verified webhook callback secures funds in escrow', async () => {
    sharedBooking.status = 'accepted';

    // 1. Create payment order with client idempotency key
    const orderDto: CreatePaymentOrderDto = {
      bookingId: sharedBooking.id,
      amountMinor: 60000,
      paymentMethod: 'bkash',
    };

    const orderResult = await paymentsService.createPaymentOrder(
      studentUser,
      orderDto,
      'e2e-idem-order-key-1',
      'req-e2e-order',
    );

    expect(orderResult.orderId).toBe('order-e2e-1');
    expect(orderResult.amountMinor).toBe(60000);
    expect(orderResult.status).toBe('pending');

    // 2. Payment Gateway Webhook Callback arrives with fresh timestamp and valid signature
    const webhookDto: Record<string, unknown> = {
      providerTransactionId: 'TRX-BKASH-E2E-999',
      providerEventId: 'EVT-BKASH-E2E-999',
      orderReference: sharedOrder.id,
      amountMinor: 60000,
      currency: 'BDT',
      status: 'succeeded',
    };

    const webhookResult = await paymentsService.handleWebhook(
      'bkash',
      { 'x-webhook-timestamp': new Date().toISOString() },
      webhookDto,
      'req-webhook-e2e',
    );

    expect(webhookResult.received).toBe(true);
    expect(webhookResult.status).toBe('succeeded');
    expect(sharedOrder.status).toBe('succeeded');
  });

  it('STAGE 3: Tutor marks attendance, assigns homework, student submits, and tutor grades submission', async () => {
    sharedBooking.status = 'confirmed';

    // 1. Tutor marks attendance for completed session
    const attRecord = await learningService.markAttendance(tutorUser, {
      sessionId: sharedSession.id,
      participantUserId: studentUser.id,
      attendanceStatus: 'present',
      notes: 'Calculus Differential Equations covered.',
    });
    expect(attRecord).toBeDefined();
    expect(attRecord.attendanceStatus).toBe('present');

    // 2. Tutor creates assignment
    const assignDto: CreateAssignmentDto = {
      bookingId: sharedBooking.id,
      title: 'Problem Set 4: Differential Equations',
      instructions: 'Complete exercises 1 through 10.',
      maxScore: 100,
      dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    };

    const assignment = await learningService.createAssignment(tutorUser, assignDto);
    expect(assignment.id).toBe('assign-e2e-1');
    expect(assignment.maxScore).toBe(100);

    // 3. Student submits assignment
    const submitDto: SubmitAssignmentDto = {
      submissionText: 'Calculus solutions attached. Completed all 10 problems.',
    };

    const submission = await learningService.submitAssignment(
      studentUser,
      assignment.id,
      submitDto,
    );
    expect(submission.status).toBe('submitted');

    // 4. Tutor grades the submission
    const gradeDto: GradeSubmissionDto = {
      score: 95,
      tutorFeedback: 'Outstanding mathematical rigor on problem 7.',
    };

    const graded = await learningService.gradeSubmission(tutorUser, submission.id, gradeDto);
    expect(graded.status).toBe('reviewed');
    expect(graded.score).toBe(95);
  });

  it('STAGE 4: Student settles session milestone releasing escrow payout, then leaves verified 5-star review', async () => {
    sharedBooking.status = 'in_progress';
    sharedSession.status = 'completed';

    // 1. Student settles session milestone (releasing 92% to tutor, 8% platform fee)
    const settleDto: SettleMilestoneDto = {
      sessionId: sharedSession.id,
    };

    const settlement = await paymentsService.settleMilestone(
      studentUser,
      settleDto,
      'req-settle-e2e',
    );
    expect(settlement).toBeDefined();
    expect(settlement.id).toBeDefined();

    // 2. Student leaves verified review
    const reviewDto: CreateReviewDto = {
      bookingId: sharedBooking.id,
      rating: 5,
      comment: 'Best calculus tutor in Dhaka. Explanations are crystal clear!',
      punctualityRating: 5,
      subjectMasteryRating: 5,
      teachingClarityRating: 5,
    };

    const review = await reviewsService.createReview(studentUser, reviewDto);
    expect(review).toBeDefined();
    expect(review.rating).toBe(5);
    expect(review.comment).toContain('Best calculus tutor');
  });

  it('STAGE 5 (NEGATIVE TEST): should enforce anti-self-review invariant preventing tutor from reviewing themselves', async () => {
    sharedBooking.status = 'in_progress';

    const selfReviewDto: CreateReviewDto = {
      bookingId: sharedBooking.id,
      rating: 5,
      comment: 'I am the greatest tutor.',
    };

    await expect(reviewsService.createReview(tutorUser, selfReviewDto)).rejects.toThrow(
      /Tutors cannot review their own sessions/i,
    );
  });
});
