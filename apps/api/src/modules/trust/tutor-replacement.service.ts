import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutorReplacementCaseEntity } from './entities/tutor-replacement-case.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { NotificationService } from '../notifications/notification.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateReplacementCaseDto, UpdateReplacementCaseDto } from './dto';

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
  ) {}

  /**
   * 1. Submit Tutor Replacement Guarantee Request (FR-011)
   * Invariants:
   * - Must be student or guardian participant of booking.
   * - Booking cannot be in terminal invalid states ('declined', 'cancelled').
   */
  async requestReplacement(
    user: AuthenticatedUser,
    dto: CreateReplacementCaseDto,
  ): Promise<TutorReplacementCaseEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    // ABAC Participant Check: User must be student or requester guardian
    const isStudent = user.id === booking.studentUserId;
    const isRequester = user.id === booking.requesterUserId;
    if (!isStudent && !isRequester) {
      throw new ForbiddenException(
        'Access denied: Only the student or guardian participant can request a tutor replacement',
      );
    }

    if (['declined', 'cancelled', 'expired'].includes(booking.status)) {
      throw new BadRequestException(
        `Cannot request replacement for booking in '${booking.status}' status`,
      );
    }

    // Check for existing open replacement case
    const existing = await this.caseRepo.findOne({
      where: {
        bookingId: dto.bookingId,
      },
    });

    if (existing && !['closed', 'rejected'].includes(existing.status)) {
      throw new BadRequestException('A replacement case is already active for this booking');
    }

    const replacementCase = this.caseRepo.create({
      bookingId: dto.bookingId,
      requestedBy: user.id,
      reasonCode: dto.reasonCode,
      explanation: dto.explanation,
      status: 'requested',
      policyVersion: 'v1.0-tutor-replacement-guarantee',
    });

    const savedCase = await this.caseRepo.save(replacementCase);

    // Update booking status
    booking.status = 'replacement_requested';
    await this.bookingRepo.save(booking);

    // Audit Log
    const auditLog = this.auditRepo.create({
      actorUserId: user.id,
      action: 'replacement.requested',
      resourceType: 'tutor_replacement_cases',
      resourceId: savedCase.id,
      safeMetadata: {
        bookingId: booking.id,
        reasonCode: dto.reasonCode,
      },
    });
    await this.auditRepo
      .save(auditLog)
      .catch((err) =>
        this.logger.warn(`Failed to persist audit log for replacement request: ${err}`),
      );

    // Outbox Event
    const outboxEvent = this.outboxRepo.create({
      eventType: 'replacement.requested',
      aggregateType: 'replacement_case',
      aggregateId: savedCase.id,
      payload: {
        caseId: savedCase.id,
        bookingId: booking.id,
        reasonCode: dto.reasonCode,
        requestedBy: user.id,
      },
    });
    await this.outboxRepo
      .save(outboxEvent)
      .catch((err) =>
        this.logger.warn(`Failed to emit outbox event for replacement request: ${err}`),
      );

    // Notify Operations / Support
    this.logger.log(
      `TUTOR REPLACEMENT GUARANTEE CASE FILED: ${savedCase.id} for Booking: ${booking.id}`,
    );

    return savedCase;
  }

  /**
   * 2. Get Replacement Case Details (ABAC Scoped)
   * Invariant: Unrelated users receive 403 Forbidden (Unrelated case denial)
   */
  async getCase(user: AuthenticatedUser, caseId: string): Promise<TutorReplacementCaseEntity> {
    const replacementCase = await this.caseRepo.findOne({
      where: { id: caseId },
      relations: { booking: true, requester: true, replacementTutor: true },
    });

    if (!replacementCase) {
      throw new NotFoundException(`Tutor replacement case ${caseId} not found`);
    }

    const isRequester = user.id === replacementCase.requestedBy;
    const isBookingStudent = user.id === replacementCase.booking?.studentUserId;
    const isBookingGuardian = user.id === replacementCase.booking?.requesterUserId;
    const isAdmin = user.roles?.includes('admin');

    if (!isRequester && !isBookingStudent && !isBookingGuardian && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this replacement case',
      );
    }

    return replacementCase;
  }

  /**
   * 3. List Replacement Cases (Admin or User's Own)
   */
  async listCases(user: AuthenticatedUser): Promise<TutorReplacementCaseEntity[]> {
    const isAdmin = user.roles?.includes('admin');
    const where: any = isAdmin ? {} : { requestedBy: user.id };

    return this.caseRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { booking: true, replacementTutor: true },
    });
  }

  /**
   * 4. Update Replacement Case Status & Assignment (Admin only)
   * State Machine: requested -> under_review -> matching -> offered -> accepted / rejected / closed
   */
  async updateCaseStatus(
    user: AuthenticatedUser,
    caseId: string,
    dto: UpdateReplacementCaseDto,
  ): Promise<TutorReplacementCaseEntity> {
    if (!user.roles?.includes('admin')) {
      throw new ForbiddenException('Admin privileges required to manage tutor replacement cases');
    }

    const replacementCase = await this.caseRepo.findOne({
      where: { id: caseId },
      relations: { booking: true },
    });

    if (!replacementCase) {
      throw new NotFoundException(`Tutor replacement case ${caseId} not found`);
    }

    if (dto.status) {
      replacementCase.status = dto.status;
    }
    if (dto.replacementTutorUserId) {
      replacementCase.replacementTutorUserId = dto.replacementTutorUserId;
    }
    if (dto.outcomeNotes) {
      replacementCase.outcomeNotes = dto.outcomeNotes;
    }

    if (dto.status === 'accepted' || dto.status === 'rejected' || dto.status === 'closed') {
      replacementCase.resolvedAt = new Date();
    }

    const updated = await this.caseRepo.save(replacementCase);

    // If replacement accepted, re-bind tutor and restore booking status
    if (dto.status === 'accepted' && dto.replacementTutorUserId && replacementCase.booking) {
      const booking = replacementCase.booking;
      booking.tutorUserId = dto.replacementTutorUserId;
      booking.status = 'confirmed';
      await this.bookingRepo.save(booking);

      // Notify student
      await this.notificationService
        .dispatch({
          userId: booking.studentUserId,
          recipientRole: 'student',
          eventType: 'system.announcement',
          payload: {
            bookingId: booking.id,
            message: 'A verified replacement tutor has been matched and assigned to your course.',
          },
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch replacement notification to student: ${err}`),
        );
    }

    // Audit log
    await this.auditRepo
      .save(
        this.auditRepo.create({
          actorUserId: user.id,
          action: 'replacement.status_updated',
          resourceType: 'tutor_replacement_cases',
          resourceId: replacementCase.id,
          reason: dto.outcomeNotes || 'Replacement workflow transition',
          safeMetadata: {
            status: replacementCase.status,
            replacementTutorUserId: dto.replacementTutorUserId,
          },
        }),
      )
      .catch((err) =>
        this.logger.warn(`Failed to persist audit log for replacement update: ${err}`),
      );

    return updated;
  }
}
