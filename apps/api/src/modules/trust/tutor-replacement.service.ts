import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  LessThan,
  QueryFailedError,
  Repository,
  type EntityManager,
  type QueryDeepPartialEntity,
} from 'typeorm';
import {
  TutorReplacementCaseEntity,
  ACTIVE_REPLACEMENT_STATUSES,
  type ReplacementStatus,
} from './entities/tutor-replacement-case.entity';
import { TutorReplacementCaseEventEntity } from './entities/tutor-replacement-case-event.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../bookings/entities/booking-session.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { NotificationService } from '../notifications/notification.service';
import { TutorSearchService } from '../tutors/services/tutor-search.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';
import {
  CreateReplacementCaseDto,
  ExtendReplacementDeadlineDto,
  UpdateReplacementCaseDto,
} from './dto';
import type { ReplacementCaseQueryDto } from './dto/update-replacement-case.dto';
import {
  canTransitionReplacement,
  computeReplacementDeadline,
  MAX_DEADLINE_EXTENSION_HOURS,
  MIN_DEADLINE_EXTENSION_HOURS,
  OPEN_REPLACEMENT_STATUSES,
  PARTICIPANT_CANCELLABLE_STATUSES,
  REPLACEMENT_POLICY_VERSION,
  RESOLVED_REPLACEMENT_STATUSES,
} from './constants/replacement-policy.constants';
import {
  evaluateReplacementEligibility,
  REPLACEMENT_ELIGIBLE_BOOKING_STATUSES,
  summarizeEligibleReasons,
} from './services/replacement-eligibility';
import {
  TutorReplacementNotifier,
  type ReplacementNotificationContext,
} from './services/tutor-replacement-notifier';
import {
  presentReplacementCase,
  presentReplacementEvent,
} from './services/tutor-replacement-presenter';
import type {
  EligibleBookingView,
  ReplacementCaseDetailView,
  ReplacementCaseView,
} from './interfaces/replacement-case-view.interface';

interface ReplacementRepos {
  caseRepo: Repository<TutorReplacementCaseEntity>;
  bookingRepo: Repository<BookingEntity>;
  outboxRepo: Repository<OutboxEventEntity>;
  auditRepo: Repository<AuditLogEntity>;
  eventRepo: Repository<TutorReplacementCaseEventEntity>;
}

export interface ReplacementListResponse {
  data: ReplacementCaseView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class TutorReplacementService {
  private readonly logger = new Logger(TutorReplacementService.name);

  constructor(
    @InjectRepository(TutorReplacementCaseEntity)
    private readonly caseRepo: Repository<TutorReplacementCaseEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
    @Optional()
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo?: Repository<BookingSessionEntity>,
    @Optional()
    @Inject(TutorSearchService)
    private readonly searchService?: TutorSearchService,
    @Optional()
    @Inject(TutorReplacementNotifier)
    private readonly notifier?: TutorReplacementNotifier,
    @Optional()
    @InjectRepository(TutorReplacementCaseEventEntity)
    private readonly eventRepo?: Repository<TutorReplacementCaseEventEntity>,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  // ---------------------------------------------------------------------------
  // Participant intake
  // ---------------------------------------------------------------------------

  async requestReplacement(
    user: AuthenticatedUser,
    dto: CreateReplacementCaseDto,
  ): Promise<ReplacementCaseView> {
    const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }
    this.assertParticipant(user, booking);

    const sessions = await this.loadSessions(booking.id);
    const eligibility = evaluateReplacementEligibility({
      bookingStatus: booking.status,
      reasonCode: dto.reasonCode,
      sessions,
    });
    if (!eligibility.eligible) {
      throw new BadRequestException(
        eligibility.error ?? 'Booking is not eligible for replacement.',
      );
    }

    const existing = await this.caseRepo.findOne({
      where: { bookingId: booking.id, status: In([...ACTIVE_REPLACEMENT_STATUSES]) },
    });
    if (existing) {
      throw new BadRequestException('A replacement case is already active for this booking.');
    }

    const now = new Date();
    const created = this.caseRepo.create({
      bookingId: booking.id,
      requestedBy: user.id,
      reasonCode: dto.reasonCode,
      explanation: dto.explanation.trim(),
      status: 'requested',
      policyVersion: REPLACEMENT_POLICY_VERSION,
      deadlineAt: computeReplacementDeadline(now),
      refundEligibility: 'not_determined',
      version: 1,
    });

    let savedId: string;
    try {
      savedId = await this.withTransaction(async (repos, _atomic) => {
        const saved = await repos.caseRepo.save(created);

        if (booking.status !== 'replacement_requested') {
          booking.status = 'replacement_requested';
          await repos.bookingRepo.save(booking);
        }

        await this.recordEvent(repos, {
          caseId: saved.id,
          actorUserId: user.id,
          actorRole: this.actorRole(user),
          eventType: 'case.requested',
          fromStatus: null,
          toStatus: 'requested',
          userVisibleNote: 'Replacement guarantee request received.',
          internalNote: null,
          metadata: { reasonCode: dto.reasonCode },
        });
        await this.recordAudit(repos, {
          actorUserId: user.id,
          action: 'replacement.requested',
          resourceId: saved.id,
          reason: dto.reasonCode,
          metadata: { bookingId: booking.id, reasonCode: dto.reasonCode },
        });
        await this.recordOutbox(repos, saved.id, 'replacement.requested', {
          caseId: saved.id,
          bookingId: booking.id,
          reasonCode: dto.reasonCode,
          requestedBy: user.id,
        });
        created.booking = booking;
        return saved.id;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException('A replacement case is already active for this booking.');
      }
      throw error;
    }

    void this.notifyOwnerAndStaff(
      {
        caseId: savedId,
        bookingId: booking.id,
        requestedBy: user.id,
        studentUserId: booking.studentUserId,
        requesterUserId: booking.requesterUserId,
        assignedTo: null,
      },
      'requested',
      { owner: true, staff: true },
    );

    return this.reloadView(savedId, false);
  }

  /** Bookings the caller can currently request a replacement for. */
  async listEligibleBookings(user: AuthenticatedUser): Promise<EligibleBookingView[]> {
    const bookings = await this.bookingRepo.find({
      where: [{ studentUserId: user.id }, { requesterUserId: user.id }],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const eligible = bookings.filter((booking) =>
      REPLACEMENT_ELIGIBLE_BOOKING_STATUSES.includes(booking.status),
    );
    if (eligible.length === 0) return [];

    const ids = eligible.map((booking) => booking.id);
    const sessions = this.sessionRepo
      ? await this.sessionRepo.find({ where: { bookingId: In(ids) } })
      : [];
    const activeCases = await this.caseRepo.find({
      where: { bookingId: In(ids), status: In([...ACTIVE_REPLACEMENT_STATUSES]) },
    });
    const activeByBooking = new Map(activeCases.map((item) => [item.bookingId, item.id]));

    return eligible.map((booking) => {
      const bookingSessions = sessions.filter((session) => session.bookingId === booking.id);
      const firstCompleted = [...bookingSessions]
        .filter((session) => session.status === 'completed')
        .sort(
          (a, b) =>
            new Date(a.completedAt ?? a.startsAt).getTime() -
            new Date(b.completedAt ?? b.startsAt).getTime(),
        )[0];
      const reasons = summarizeEligibleReasons({
        bookingStatus: booking.status,
        sessions: bookingSessions,
      });
      return {
        bookingId: booking.id,
        status: booking.status,
        subjectId: booking.subjectId,
        educationLevelId: booking.educationLevelId,
        tutorUserId: booking.tutorUserId,
        mode: booking.mode,
        createdAt: new Date(booking.createdAt).toISOString(),
        activeCaseId: activeByBooking.get(booking.id) ?? null,
        firstCompletedSessionAt: firstCompleted
          ? new Date(firstCompleted.completedAt ?? firstCompleted.startsAt).toISOString()
          : null,
        trialWindowOpen: reasons.includes('trial_dissatisfaction'),
        hasTutorNoShow: reasons.includes('tutor_no_show'),
        tutorCancellationCount: bookingSessions.filter(
          (session) =>
            session.status === 'cancelled' &&
            session.cancellationAssessment?.initiatedByRole === 'tutor',
        ).length,
        eligibleReasonCodes: reasons,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async getCase(user: AuthenticatedUser, caseId: string): Promise<ReplacementCaseDetailView> {
    const entity = await this.loadCaseOrThrow(caseId);
    this.assertCanView(user, entity);
    const includeInternal = isAdminRole(user);
    const events = this.eventRepo
      ? await this.eventRepo.find({ where: { caseId }, order: { createdAt: 'ASC' } })
      : [];
    return {
      case: presentReplacementCase(entity, { includeInternal }),
      history: events.map((event) => presentReplacementEvent(event, { includeInternal })),
    };
  }

  async listCases(
    user: AuthenticatedUser,
    query: ReplacementCaseQueryDto = {},
  ): Promise<ReplacementListResponse> {
    const admin = isAdminRole(user);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

    const qb = this.caseRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.booking', 'booking')
      .leftJoinAndSelect('c.replacementTutor', 'replacementTutor');

    if (admin) {
      if (query.status) qb.andWhere('c.status = :status', { status: query.status });
      if (query.assignedToMe) qb.andWhere('c.assigned_to = :uid', { uid: user.id });
    } else {
      qb.andWhere(
        `(c.requested_by = :uid OR booking.student_user_id = :uid OR booking.requester_user_id = :uid)`,
        { uid: user.id },
      );
      if (query.status) qb.andWhere('c.status = :status', { status: query.status });
    }
    if (query.overdue) {
      qb.andWhere('c.deadline_at IS NOT NULL AND c.deadline_at < :now', { now: new Date() });
      qb.andWhere('c.status IN (:...openStatuses)', {
        openStatuses: [...OPEN_REPLACEMENT_STATUSES],
      });
    }

    qb.orderBy('c.created_at', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => presentReplacementCase(row, { includeInternal: admin })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /** Real discovery results for the booking's subject/level. */
  async listCandidates(user: AuthenticatedUser, caseId: string) {
    await this.getCase(user, caseId);
    if (!this.searchService) {
      throw new BadRequestException('Tutor matching is not available in this runtime.');
    }
    const entity = await this.loadCaseOrThrow(caseId);
    if (!OPEN_REPLACEMENT_STATUSES.includes(entity.status)) {
      throw new BadRequestException('Candidate matching is only available for open cases.');
    }
    const booking =
      entity.booking ?? (await this.bookingRepo.findOne({ where: { id: entity.bookingId } }));
    if (!booking) {
      throw new NotFoundException('Booking for this replacement case was not found.');
    }

    const results = await this.searchService.searchTutors({
      subjectId: booking.subjectId,
      educationLevelId: booking.educationLevelId,
      mode: booking.mode as 'in_person' | 'online' | 'hybrid',
      sort: 'recommended',
      page: 1,
      limit: 8,
    });
    const excluded = new Set(
      [booking.tutorUserId, entity.replacementTutorUserId].filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
    );
    const data = results.data.filter((candidate) => !excluded.has(candidate.id)).slice(0, 5);
    return { success: true, data, total: data.length };
  }

  // ---------------------------------------------------------------------------
  // Staff decisions
  // ---------------------------------------------------------------------------

  async updateCaseStatus(
    user: AuthenticatedUser,
    caseId: string,
    dto: UpdateReplacementCaseDto,
  ): Promise<ReplacementCaseView> {
    if (!isAdminRole(user)) {
      throw new ForbiddenException('Admin privileges required to manage tutor replacement cases');
    }
    const entity = await this.loadCaseOrThrow(caseId);
    const current = entity.status;
    const target = dto.status ?? current;

    if (target === 'accepted') {
      throw new BadRequestException(
        'Acceptance requires participant consent. Ask the student or guardian to accept the offered tutor.',
      );
    }
    if (target !== current && !canTransitionReplacement(current, target)) {
      throw new BadRequestException(`Invalid replacement transition: ${current} → ${target}.`);
    }

    const booking = entity.booking;
    let replacementTutorUserId = entity.replacementTutorUserId ?? null;
    if (dto.replacementTutorUserId !== undefined) {
      await this.assertEligibleReplacementTutor(dto.replacementTutorUserId, booking?.tutorUserId);
      replacementTutorUserId = dto.replacementTutorUserId;
    }
    if (target === 'offered' && !replacementTutorUserId) {
      throw new BadRequestException('An eligible replacement tutor is required to offer a match.');
    }
    if (target === 'matching' && current === 'offered') {
      replacementTutorUserId = null;
    }

    const refundEligibility = dto.refundEligibility ?? entity.refundEligibility;
    if (target === 'refund_eligible' && refundEligibility !== 'eligible') {
      throw new BadRequestException(
        'Refund eligibility must be recorded as eligible before moving the case to refund_eligible.',
      );
    }

    const now = new Date();
    const resolved = RESOLVED_REPLACEMENT_STATUSES.includes(target);
    const changes: Partial<TutorReplacementCaseEntity> = {
      status: target,
      replacementTutorUserId,
      refundEligibility,
      userVisibleNote: dto.userVisibleNote ?? entity.userVisibleNote ?? null,
      outcomeNotes: dto.internalNote ?? entity.outcomeNotes ?? null,
      assignedTo: dto.assignedTo ?? entity.assignedTo ?? null,
      resolvedAt: resolved ? (entity.resolvedAt ?? now) : null,
      refundDecidedAt:
        refundEligibility === 'not_determined' ? null : (entity.refundDecidedAt ?? now),
    };

    await this.withTransaction(async (repos, atomic) => {
      await this.saveCase(
        repos,
        entity,
        caseId,
        dto.expectedVersion ?? entity.version,
        changes,
        atomic,
      );
      await this.recordEvent(repos, {
        caseId,
        actorUserId: user.id,
        actorRole: this.actorRole(user),
        eventType: target === current ? 'case.note_added' : 'case.status_changed',
        fromStatus: current,
        toStatus: target,
        userVisibleNote: dto.userVisibleNote ?? null,
        internalNote: dto.internalNote ?? null,
        metadata: {
          replacementTutorUserId,
          refundEligibility,
          assignedTo: changes.assignedTo ?? null,
        },
      });
      await this.recordAudit(repos, {
        actorUserId: user.id,
        action: 'replacement.status_updated',
        resourceId: caseId,
        reason: dto.userVisibleNote ?? dto.internalNote ?? 'Replacement workflow transition',
        metadata: {
          fromStatus: current,
          toStatus: target,
          refundEligibility,
          replacementTutorUserId,
        },
      });
      if (target === 'offered' && replacementTutorUserId) {
        await this.recordOutbox(repos, caseId, 'replacement.offered', {
          caseId,
          bookingId: entity.bookingId,
          replacementTutorUserId,
        });
      }
    });

    const context = this.contextFor(entity);
    if (target === 'offered') {
      void this.notifyOwnerAndStaff(context, 'offered', { owner: true, staff: false });
      if (replacementTutorUserId) {
        void this.notifier?.notifyTutor(replacementTutorUserId, context, 'offered');
      }
    } else if (['rejected', 'refund_eligible', 'closed', 'cancelled'].includes(target)) {
      void this.notifyOwnerAndStaff(context, target, { owner: true, staff: true });
    } else if (dto.assignedTo && dto.assignedTo !== entity.assignedTo) {
      void this.notifier?.notifyStaff({ ...context, assignedTo: dto.assignedTo }, target);
    }

    return this.reloadView(caseId, isAdminRole(user));
  }

  async extendDeadline(
    user: AuthenticatedUser,
    caseId: string,
    dto: ExtendReplacementDeadlineDto,
  ): Promise<ReplacementCaseView> {
    if (!isAdminRole(user)) {
      throw new ForbiddenException('Admin privileges required to extend a replacement deadline');
    }
    if (dto.hours < MIN_DEADLINE_EXTENSION_HOURS || dto.hours > MAX_DEADLINE_EXTENSION_HOURS) {
      throw new BadRequestException(
        `Extension must be between ${MIN_DEADLINE_EXTENSION_HOURS} and ${MAX_DEADLINE_EXTENSION_HOURS} hours.`,
      );
    }
    const entity = await this.loadCaseOrThrow(caseId);
    if (!OPEN_REPLACEMENT_STATUSES.includes(entity.status)) {
      throw new BadRequestException('Only an open case can have its deadline extended.');
    }
    if (entity.extendedAt && !user.roles?.includes('super_admin')) {
      throw new ForbiddenException('Only a super admin can extend a deadline a second time.');
    }

    const now = new Date();
    const base =
      entity.deadlineAt && new Date(entity.deadlineAt) > now ? new Date(entity.deadlineAt) : now;
    const deadlineAt = new Date(base.getTime() + dto.hours * 60 * 60 * 1000);

    await this.withTransaction(async (repos, atomic) => {
      await this.saveCase(
        repos,
        entity,
        caseId,
        entity.version,
        { deadlineAt, extendedAt: now, extensionReason: dto.reason },
        atomic,
      );
      await this.recordEvent(repos, {
        caseId,
        actorUserId: user.id,
        actorRole: this.actorRole(user),
        eventType: 'case.deadline_extended',
        fromStatus: entity.status,
        toStatus: entity.status,
        userVisibleNote: `The matching deadline was extended by ${dto.hours} hours.`,
        internalNote: dto.reason,
        metadata: { deadlineAt: deadlineAt.toISOString(), hours: dto.hours },
      });
      await this.recordAudit(repos, {
        actorUserId: user.id,
        action: 'replacement.deadline_extended',
        resourceId: caseId,
        reason: dto.reason,
        metadata: { deadlineAt: deadlineAt.toISOString(), hours: dto.hours },
      });
    });

    return this.reloadView(caseId, true);
  }

  // ---------------------------------------------------------------------------
  // Participant consent
  // ---------------------------------------------------------------------------

  async acceptOffer(user: AuthenticatedUser, caseId: string): Promise<ReplacementCaseView> {
    const entity = await this.loadCaseOrThrow(caseId);
    const booking = entity.booking;
    if (!booking) throw new NotFoundException('Booking for this replacement case was not found.');
    this.assertParticipant(user, booking);
    if (entity.status !== 'offered' || !entity.replacementTutorUserId) {
      throw new BadRequestException('There is no offered replacement tutor to accept.');
    }
    if (['cancelled', 'declined', 'expired', 'completed'].includes(booking.status)) {
      throw new BadRequestException(`Booking status '${booking.status}' cannot be rebound.`);
    }
    await this.assertEligibleReplacementTutor(entity.replacementTutorUserId, booking.tutorUserId);

    const previousTutorId = booking.tutorUserId;
    const now = new Date();
    await this.withTransaction(async (repos, atomic) => {
      await this.saveCase(
        repos,
        entity,
        caseId,
        entity.version,
        {
          status: 'accepted',
          resolvedAt: now,
          userVisibleNote: 'Replacement tutor accepted by the student/guardian.',
          refundEligibility: 'not_eligible',
          refundDecidedAt: now,
        },
        atomic,
      );
      booking.tutorUserId = entity.replacementTutorUserId!;
      booking.status = 'confirmed';
      await repos.bookingRepo.save(booking);
      await this.recordEvent(repos, {
        caseId,
        actorUserId: user.id,
        actorRole: this.actorRole(user),
        eventType: 'case.replacement_accepted',
        fromStatus: 'offered',
        toStatus: 'accepted',
        userVisibleNote: 'Replacement tutor accepted.',
        internalNote: null,
        metadata: { replacementTutorUserId: entity.replacementTutorUserId, previousTutorId },
      });
      await this.recordAudit(repos, {
        actorUserId: user.id,
        action: 'replacement.accepted',
        resourceId: caseId,
        metadata: {
          bookingId: booking.id,
          replacementTutorUserId: entity.replacementTutorUserId,
          previousTutorId,
        },
      });
      await this.recordOutbox(repos, caseId, 'replacement.accepted', {
        caseId,
        bookingId: booking.id,
        replacementTutorUserId: entity.replacementTutorUserId,
      });
    });

    const context = this.contextFor(entity);
    void this.notifyOwnerAndStaff(context, 'accepted', { owner: true, staff: true });
    void this.notifier?.notifyStudent(context, 'accepted');
    if (entity.replacementTutorUserId) {
      void this.notifier?.notifyTutor(entity.replacementTutorUserId, context, 'accepted');
    }
    if (previousTutorId) {
      void this.notifier?.notifyTutor(previousTutorId, context, 'accepted');
    }
    return this.reloadView(caseId, false);
  }

  async declineOffer(user: AuthenticatedUser, caseId: string): Promise<ReplacementCaseView> {
    const entity = await this.loadCaseOrThrow(caseId);
    const booking = entity.booking;
    if (!booking) throw new NotFoundException('Booking for this replacement case was not found.');
    this.assertParticipant(user, booking);
    if (entity.status !== 'offered') {
      throw new BadRequestException('Only an offered replacement can be declined.');
    }

    await this.withTransaction(async (repos, atomic) => {
      await this.saveCase(
        repos,
        entity,
        caseId,
        entity.version,
        { status: 'matching', replacementTutorUserId: null, resolvedAt: null },
        atomic,
      );
      await this.recordEvent(repos, {
        caseId,
        actorUserId: user.id,
        actorRole: this.actorRole(user),
        eventType: 'case.replacement_declined',
        fromStatus: 'offered',
        toStatus: 'matching',
        userVisibleNote: 'Offered replacement declined; matching continues.',
        internalNote: null,
        metadata: {},
      });
      await this.recordAudit(repos, {
        actorUserId: user.id,
        action: 'replacement.offer_declined',
        resourceId: caseId,
        metadata: { declinedBy: user.id },
      });
    });

    void this.notifyOwnerAndStaff(this.contextFor(entity), 'matching', {
      owner: false,
      staff: true,
    });
    return this.reloadView(caseId, false);
  }

  async cancelCase(user: AuthenticatedUser, caseId: string): Promise<ReplacementCaseView> {
    const entity = await this.loadCaseOrThrow(caseId);
    const booking = entity.booking;
    if (!booking) throw new NotFoundException('Booking for this replacement case was not found.');
    const admin = isAdminRole(user);
    if (!admin) {
      this.assertParticipant(user, booking);
      if (!PARTICIPANT_CANCELLABLE_STATUSES.includes(entity.status)) {
        throw new BadRequestException('This case can no longer be cancelled by the participant.');
      }
    } else if (!OPEN_REPLACEMENT_STATUSES.includes(entity.status)) {
      throw new BadRequestException('Only an open case can be cancelled.');
    }

    const now = new Date();
    await this.withTransaction(async (repos, atomic) => {
      await this.saveCase(
        repos,
        entity,
        caseId,
        entity.version,
        {
          status: 'cancelled',
          resolvedAt: now,
          userVisibleNote: 'Replacement request cancelled.',
        },
        atomic,
      );
      await this.recordEvent(repos, {
        caseId,
        actorUserId: user.id,
        actorRole: this.actorRole(user),
        eventType: 'case.cancelled',
        fromStatus: entity.status,
        toStatus: 'cancelled',
        userVisibleNote: 'Replacement request cancelled.',
        internalNote: null,
        metadata: {},
      });
      await this.recordAudit(repos, {
        actorUserId: user.id,
        action: 'replacement.cancelled',
        resourceId: caseId,
      });
    });

    void this.notifyOwnerAndStaff(this.contextFor(entity), 'cancelled', {
      owner: true,
      staff: true,
    });
    return this.reloadView(caseId, admin);
  }

  // ---------------------------------------------------------------------------
  // Deadline processing (idempotent)
  // ---------------------------------------------------------------------------

  async runOverdueSweep(): Promise<{ processed: number }> {
    const now = new Date();
    const due = await this.caseRepo.find({
      where: {
        status: In([...OPEN_REPLACEMENT_STATUSES]),
        deadlineAt: LessThan(now),
        overdueNotifiedAt: IsNull(),
      },
      relations: { booking: true, replacementTutor: true },
      take: 200,
      order: { deadlineAt: 'ASC' },
    });

    let processed = 0;
    for (const entity of due) {
      const marked = await this.markOverdueOnce(entity.id, now);
      if (!marked) continue;
      processed += 1;
      if (this.eventRepo) {
        await this.eventRepo
          .save(
            this.eventRepo.create({
              caseId: entity.id,
              actorUserId: null,
              actorRole: 'system',
              eventType: 'case.overdue',
              fromStatus: entity.status,
              toStatus: entity.status,
              userVisibleNote: 'The replacement matching deadline has passed and was escalated.',
              internalNote: null,
              metadata: { deadlineAt: entity.deadlineAt?.toISOString() ?? null },
            }),
          )
          .catch((error) =>
            this.logger.warn(`Failed to persist overdue event for ${entity.id}: ${String(error)}`),
          );
      }
      const context = this.contextFor(entity);
      void this.notifyOwnerAndStaff(context, 'overdue', { owner: true, staff: true });
    }

    return { processed };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async withTransaction<T>(
    work: (repos: ReplacementRepos, atomic: boolean) => Promise<T>,
  ): Promise<T> {
    if (!this.dataSource) {
      return work(
        {
          caseRepo: this.caseRepo,
          bookingRepo: this.bookingRepo,
          outboxRepo: this.outboxRepo,
          auditRepo: this.auditRepo,
          eventRepo: this.eventRepo as Repository<TutorReplacementCaseEventEntity>,
        },
        false,
      );
    }
    return this.dataSource.transaction(async (manager: EntityManager) =>
      work(
        {
          caseRepo: manager.getRepository(TutorReplacementCaseEntity),
          bookingRepo: manager.getRepository(BookingEntity),
          outboxRepo: manager.getRepository(OutboxEventEntity),
          auditRepo: manager.getRepository(AuditLogEntity),
          eventRepo: manager.getRepository(TutorReplacementCaseEventEntity),
        },
        true,
      ),
    );
  }

  /**
   * Optimistic-concurrency write. With a real DataSource the update is a single
   * `UPDATE … WHERE id = ? AND version = ?`; a lost race raises 409 instead of
   * silently overwriting another reviewer's decision.
   */
  private async saveCase(
    repos: ReplacementRepos,
    entity: TutorReplacementCaseEntity,
    caseId: string,
    expectedVersion: number,
    changes: Partial<TutorReplacementCaseEntity>,
    atomic: boolean,
  ): Promise<void> {
    const nextVersion = expectedVersion + 1;
    if (atomic) {
      const result = await repos.caseRepo
        .createQueryBuilder()
        .update(TutorReplacementCaseEntity)
        .set({
          ...changes,
          version: nextVersion,
          updatedAt: new Date(),
        } as QueryDeepPartialEntity<TutorReplacementCaseEntity>)
        .where('id = :id AND version = :version', { id: caseId, version: expectedVersion })
        .execute();
      if (!result.affected) {
        throw new ConflictException(
          'The replacement case was updated by another reviewer. Reload and try again.',
        );
      }
      Object.assign(entity, changes, { version: nextVersion });
      return;
    }
    Object.assign(entity, changes, { version: nextVersion });
    await repos.caseRepo.save(entity);
  }

  private async recordEvent(
    repos: ReplacementRepos,
    input: {
      caseId: string;
      actorUserId: string | null;
      actorRole: TutorReplacementCaseEventEntity['actorRole'];
      eventType: string;
      fromStatus: ReplacementStatus | null;
      toStatus: ReplacementStatus | null;
      userVisibleNote: string | null;
      internalNote: string | null;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!repos.eventRepo) return;
    await repos.eventRepo.save(repos.eventRepo.create(input));
  }

  private async recordAudit(
    repos: ReplacementRepos,
    input: {
      actorUserId: string;
      action: string;
      resourceId: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await repos.auditRepo
      .save(
        repos.auditRepo.create({
          actorUserId: input.actorUserId,
          action: input.action,
          resourceType: 'tutor_replacement_cases',
          resourceId: input.resourceId,
          reason: input.reason,
          safeMetadata: input.metadata ?? {},
        }),
      )
      .catch((error) =>
        this.logger.warn(`Failed to persist replacement audit log: ${String(error)}`),
      );
  }

  private async recordOutbox(
    repos: ReplacementRepos,
    caseId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await repos.outboxRepo
      .save(
        repos.outboxRepo.create({
          eventType,
          aggregateType: 'replacement_case',
          aggregateId: caseId,
          payload,
        }),
      )
      .catch((error) =>
        this.logger.warn(`Failed to emit replacement outbox event: ${String(error)}`),
      );
  }

  private async loadCaseOrThrow(caseId: string): Promise<TutorReplacementCaseEntity> {
    const entity = await this.caseRepo.findOne({
      where: { id: caseId },
      relations: { booking: true, requester: true, replacementTutor: true },
    });
    if (!entity) {
      throw new NotFoundException(`Tutor replacement case ${caseId} not found`);
    }
    return entity;
  }

  private async reloadView(caseId: string, includeInternal: boolean): Promise<ReplacementCaseView> {
    const entity = await this.caseRepo.findOne({
      where: { id: caseId },
      relations: { booking: true, requester: true, replacementTutor: true },
    });
    if (!entity) {
      throw new NotFoundException(`Tutor replacement case ${caseId} not found`);
    }
    return presentReplacementCase(entity, { includeInternal });
  }

  private async loadSessions(bookingId: string): Promise<BookingSessionEntity[]> {
    if (!this.sessionRepo) return [];
    return this.sessionRepo.find({ where: { bookingId }, order: { startsAt: 'ASC' } });
  }

  private assertParticipant(user: AuthenticatedUser, booking: BookingEntity): void {
    if (user.id !== booking.studentUserId && user.id !== booking.requesterUserId) {
      throw new ForbiddenException(
        'Access denied: only the student or guardian participant can manage this replacement case',
      );
    }
  }

  private assertCanView(user: AuthenticatedUser, entity: TutorReplacementCaseEntity): void {
    if (isAdminRole(user)) return;
    const booking = entity.booking;
    const allowed =
      user.id === entity.requestedBy ||
      user.id === booking?.studentUserId ||
      user.id === booking?.requesterUserId;
    if (!allowed) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this replacement case',
      );
    }
  }

  private async assertEligibleReplacementTutor(
    tutorUserId: string,
    currentTutorUserId?: string,
  ): Promise<void> {
    if (currentTutorUserId && tutorUserId === currentTutorUserId) {
      throw new BadRequestException('The replacement tutor must differ from the current tutor.');
    }
    if (!this.searchService) {
      throw new BadRequestException('Tutor matching is not available in this runtime.');
    }
    try {
      await this.searchService.getPublicProfile(tutorUserId);
    } catch {
      throw new BadRequestException(
        'The selected replacement tutor is not currently verified and publicly bookable.',
      );
    }
  }

  private actorRole(user: AuthenticatedUser): 'student' | 'guardian' | 'admin' | 'super_admin' {
    if (user.roles?.includes('super_admin')) return 'super_admin';
    if (user.roles?.includes('admin')) return 'admin';
    if (user.roles?.includes('guardian')) return 'guardian';
    return 'student';
  }

  private contextFor(entity: TutorReplacementCaseEntity): ReplacementNotificationContext {
    return {
      caseId: entity.id,
      bookingId: entity.bookingId,
      requestedBy: entity.requestedBy,
      studentUserId: entity.booking?.studentUserId ?? '',
      requesterUserId: entity.booking?.requesterUserId ?? '',
      assignedTo: entity.assignedTo ?? null,
    };
  }

  private async notifyOwnerAndStaff(
    context: ReplacementNotificationContext,
    status: ReplacementStatus | 'overdue',
    options: { owner: boolean; staff: boolean },
  ): Promise<void> {
    try {
      if (this.notifier) {
        if (options.owner) await this.notifier.notifyOwner(context, status as ReplacementStatus);
        if (options.staff) await this.notifier.notifyStaff(context, status as ReplacementStatus);
        return;
      }
      // Fallback for isolated unit usage without the notifier provider.
      if (options.owner) {
        await this.notificationService
          .dispatch({
            userId: context.requestedBy,
            recipientRole: 'student',
            eventType: 'tutor.replacement',
            payload: {
              caseId: context.caseId,
              bookingId: context.bookingId,
              status,
            },
          })
          .catch(() => undefined);
      }
    } catch (error) {
      this.logger.warn(`Replacement notification failed: ${String(error)}`);
    }
  }

  /** Atomic idempotency marker for overdue escalation. */
  private async markOverdueOnce(caseId: string, now: Date): Promise<boolean> {
    if (this.dataSource) {
      const result = await this.caseRepo
        .createQueryBuilder()
        .update(TutorReplacementCaseEntity)
        .set({ overdueNotifiedAt: now })
        .where('id = :id AND overdue_notified_at IS NULL', { id: caseId })
        .execute();
      return (result.affected ?? 0) > 0;
    }
    const entity = await this.caseRepo.findOne({ where: { id: caseId } });
    if (!entity || entity.overdueNotifiedAt) return false;
    entity.overdueNotifiedAt = now;
    await this.caseRepo.save(entity);
    return true;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (error instanceof QueryFailedError) {
      const driverError = (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError;
      return driverError?.code === '23505';
    }
    return false;
  }
}
