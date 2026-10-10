import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { LedgerService } from '../src/modules/payments/ledger.service';
import { LearningService } from '../src/modules/learning/learning.service';
import { ReviewsService } from '../src/modules/trust/reviews.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { CreateBookingRequestDto } from '../src/modules/bookings/dto';
import {
  CreatePaymentOrderDto,
  PaymentWebhookDto,
  SettleMilestoneDto,
} from '../src/modules/payments/dto';
import {
  CreateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
} from '../src/modules/learning/dto';
import { CreateReviewDto } from '../src/modules/trust/dto';

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

  const adminUser: AuthenticatedUser = {
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
  let ledgerService: LedgerService;
  let learningService: LearningService;
  let reviewsService: ReviewsService;

  beforeEach(() => {
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
    );

    // 2. Ledger Service Mock Setup
    const mockAccountRepo: any = {
      find: vi.fn().mockResolvedValue([
        { id: 'acc-1', code: '1000', name: 'Gateway', balanceMinor: '0', isActive: true },
        { id: 'acc-2', code: '2100', name: 'Escrow', balanceMinor: '0', isActive: true },
        { id: 'acc-3', code: '2000', name: 'Tutor', balanceMinor: '0', isActive: true },
        { id: 'acc-4', code: '4000', name: 'Platform Revenue', balanceMinor: '0', isActive: true },
      ]),
    };

    const mockJournalRepo: any = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((j) => ({ id: 'journal-e2e-1', ...j, entries: [] })),
      save: vi.fn((j) => Promise.resolve(j)),
    };

    const mockEntryRepo: any = { create: vi.fn((e) => e) };

    const mockDataSource: any = {
      transaction: vi.fn(async (cb) => {
        return await cb({
          save: vi.fn((x) => Promise.resolve({ id: 'saved-id-1', ...(Array.isArray(x) ? {} : x) })),
          create: vi.fn((_, x) => ({ id: 'created-id-1', ...x })),
          findOne: vi.fn().mockImplementation((_, opts) => Promise.resolve(sharedBooking)),
        });
      }),
    };

    ledgerService = new LedgerService(
      mockAccountRepo,
      mockJournalRepo,
      mockEntryRepo,
      mockDataSource,
    );

    // 3. Payments Service Mock Setup
    const mockOrderRepo: any = {
      findOne: vi.fn().mockImplementation(() => Promise.resolve(sharedOrder)),
      create: vi.fn((o) => {
        sharedOrder = { ...o, id: 'order-e2e-1', status: 'pending', createdAt: new Date() };
        return sharedOrder;
      }),
      save: vi.fn(async (o) => {
        sharedOrder = { ...sharedOrder, ...o };
        return sharedOrder;
      }),
    };

    const mockTxnRepo: any = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((t) => t),
      save: vi.fn((t) => Promise.resolve(t)),
    };

    const mockRefundRepo: any = { findOne: vi.fn() };
    const mockSessionRepo: any = {
      findOne: vi.fn().mockImplementation(() => Promise.resolve(sharedSession)),
      find: vi.fn().mockResolvedValue([sharedSession]),
      save: vi.fn(async (s) => {
        sharedSession = { ...sharedSession, ...s };
        return sharedSession;
      }),
    };

    const mockAdapter = {
      createCheckoutSession: vi.fn().mockResolvedValue({
        checkoutUrl: 'https://sandbox.payment.bkash.com/checkout?token=e2e-token',
        providerOrderId: 'PROV-ORD-E2E-1',
      }),
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      queryTransaction: vi.fn().mockResolvedValue({ status: 'succeeded' }),
    };

    const mockAdapterFactory = {
      getAdapter: vi.fn().mockReturnValue(mockAdapter),
    };

    const mockOutboxRepo: any = {
      create: vi.fn((e) => e),
      save: vi.fn((e) => Promise.resolve(e)),
    };

    paymentsService = new PaymentsService(
      mockOrderRepo,
      mockTxnRepo,
      mockRefundRepo,
      mockBookingRepo,
      mockSessionRepo,
      mockLinkRepo,
      mockOutboxRepo,
      ledgerService,
      mockAdapterFactory as any,
      mockAuditService,
      mockDataSource,
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

    learningService = new LearningService(
      mockAttendanceRepo,
      mockAssignmentRepo,
      mockSubmissionRepo,
      mockProgressRepo,
      mockBookingRepo,
      mockSessionRepo,
      mockLinkRepo,
      mockAuditService,
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
      preferredDays: ['Monday', 'Wednesday'],
    };

    const createdBooking = await bookingsService.createRequest(studentUser, createDto);
    expect(createdBooking.status).toBe('requested');
    expect(createdBooking.pricePerSessionMinor).toBe('60000');

    // 2. Tutor responds with acceptance
    const acceptedBooking = await bookingsService.respondToRequest(sharedBooking.id, tutorUser, {
      action: 'accept',
    });
    expect(acceptedBooking.status).toBe('accepted');
  });

  it('STAGE 2: Student creates payment order, and verified webhook callback secures funds in escrow', async () => {
    sharedBooking.status = 'accepted';

    // 1. Create payment order with client idempotency key
    const orderDto: CreatePaymentOrderDto = {
      bookingId: sharedBooking.id,
      amountMinor: 60000,
      currency: 'BDT',
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
    const webhookDto: PaymentWebhookDto = {
      providerTransactionId: 'TRX-BKASH-E2E-999',
      providerEventId: 'EVT-BKASH-E2E-999',
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
      studentUserId: studentUser.id,
      title: 'Problem Set 4: Differential Equations',
      description: 'Complete exercises 1 through 10.',
      maxScore: 100,
      dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
    };

    const assignment = await learningService.createAssignment(tutorUser, assignDto);
    expect(assignment.id).toBe('assign-e2e-1');
    expect(assignment.maxScore).toBe(100);

    // 3. Student submits assignment
    const submitDto: SubmitAssignmentDto = {
      content: 'Calculus solutions attached. Completed all 10 problems.',
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
      subjectExpertiseRating: 5,
      communicationRating: 5,
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
