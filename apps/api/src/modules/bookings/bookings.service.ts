import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from './entities/booking.entity';
import { BookingStatusEventEntity } from './entities/booking-status-event.entity';
import { TutorProfileEntity } from '../tutors/entities/tutor-profile.entity';
import { TutorSubjectEntity } from '../tutors/entities/tutor-subject.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { SubjectEntity } from '../taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../taxonomy/entities/education-level.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import {
  CreateBookingRequestDto,
  GetBookingRequestsQueryDto,
  RespondBookingRequestDto,
  WithdrawBookingRequestDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { GuardianAccessService } from '../guardians/guardian-access.service';
import { isAdminRole } from '../../common/auth/role.utils';
import {
  applyBookingTransition,
  transitionHistoryValues,
} from './utils/booking-lifecycle';
import { isZeroPriceBooking } from './constants/booking-status-transitions';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(TutorProfileEntity)
    private readonly tutorProfileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(TutorSubjectEntity)
    private readonly tutorSubjectRepo: Repository<TutorSubjectEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly linkRepo: Repository<GuardianStudentLinkEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SubjectEntity)
    private readonly subjectRepo: Repository<SubjectEntity>,
    @InjectRepository(EducationLevelEntity)
    private readonly levelRepo: Repository<EducationLevelEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
    @Optional()
    @InjectRepository(BookingStatusEventEntity)
    private readonly statusEventRepo?: Repository<BookingStatusEventEntity>,
  ) {}

  /**
   * Create an initial booking request from a guardian or adult student.
   * Enforces anti-spam, unpublished-tutor rejection, and relationship
   * authorization. The partial unique index is the final race guard.
   */
  async createRequest(
    requester: AuthenticatedUser,
    dto: CreateBookingRequestDto,
  ): Promise<BookingEntity> {
    if (dto.tutorId === requester.id || dto.tutorId === dto.studentId) {
      throw new BadRequestException('Cannot request tutoring sessions from yourself.');
    }

    const requesterUser = await this.userRepo.findOne({ where: { id: requester.id } });
    if (!requesterUser) {
      throw new NotFoundException('Requester account not found.');
    }

    if (requester.id !== dto.studentId) {
      await this.guardianAccess.assertActiveLink(
        requester.id,
        dto.studentId,
        'Access denied: You are not authorized to create requests for this student (no active guardian link).',
      );
    }

    const tutorProfile = await this.tutorProfileRepo.findOne({
      where: { userId: dto.tutorId },
    });

    if (
      !tutorProfile ||
      tutorProfile.publicationStatus !== 'published' ||
      tutorProfile.verificationStatus !== 'approved'
    ) {
      throw new BadRequestException(
        'The requested tutor is not currently verified or published for new booking requests.',
      );
    }

    const subject = await this.subjectRepo.findOne({ where: { id: dto.subjectId } });
    if (!subject) {
      throw new NotFoundException(`Subject not found: ${dto.subjectId}`);
    }

    const level = await this.levelRepo.findOne({ where: { id: dto.educationLevelId } });
    if (!level) {
      throw new NotFoundException(`Education level not found: ${dto.educationLevelId}`);
    }

    const existingActiveRequest = await this.bookingRepo.findOne({
      where: {
        studentUserId: dto.studentId,
        tutorUserId: dto.tutorId,
        subjectId: dto.subjectId,
        status: 'requested',
      },
    });

    if (existingActiveRequest) {
      throw new ConflictException(
        'A pending tutoring request for this student, tutor, and subject already exists. Please wait for the tutor to respond or withdraw the existing request before submitting a new one.',
      );
    }

    const tutorSubject = await this.tutorSubjectRepo.findOne({
      where: {
        tutorUserId: dto.tutorId,
        subjectId: dto.subjectId,
      },
    });

    const priceMinor = tutorSubject?.rateMinor
      ? tutorSubject.rateMinor
      : tutorProfile.hourlyRateMinor || '50000';

    const booking = this.bookingRepo.create({
      requesterUserId: requester.id,
      studentUserId: dto.studentId,
      tutorUserId: dto.tutorId,
      subjectId: dto.subjectId,
      educationLevelId: dto.educationLevelId,
      mode: dto.mode,
      status: 'requested',
      pricePerSessionMinor: priceMinor,
      currency: 'BDT',
      durationMinutes: 60,
      cancellationPolicyVersion: 'v1.0-standard-cancellation',
      serviceAgreementSnapshot: {
        message: dto.messageNotes,
        preferredDays: dto.preferredDays || [],
        hourlyRateMinor: priceMinor,
        sessionDurationMinutes: 60,
      },
    });

    let saved: BookingEntity;
    try {
      saved = await this.bookingRepo.save(booking);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? (err as { code: unknown }).code
          : undefined;
      if (code === '23505') {
        throw new ConflictException(
          'A pending tutoring request for this student, tutor, and subject already exists.',
        );
      }
      throw err;
    }

    await this.recordStatusEvent(saved.id, {
      from: null,
      to: 'requested',
      changed: true,
    }, {
      actorUserId: requester.id,
      actorRole: requester.roles?.[0] ?? 'student',
      metadata: { tutorId: dto.tutorId, studentId: dto.studentId },
    });

    await this.auditService.record({
      actorUserId: requester.id,
      action: 'booking.request.created',
      resourceType: 'booking',
      resourceId: saved.id,
      safeMetadata: {
        tutorId: dto.tutorId,
        studentId: dto.studentId,
        subjectId: dto.subjectId,
        mode: dto.mode,
      },
    });

    if (this.notificationService) {
      try {
        await this.notificationService.dispatch({
          userId: dto.tutorId,
          eventType: 'booking.requested',
          recipientRole: 'tutor',
          payload: {
            bookingId: saved.id,
            subjectName: subject.nameEn,
            requesterName: requesterUser.displayName,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to dispatch booking.requested notification: ${err}`);
      }
    }

    return saved;
  }

  /**
   * List requests accessible to the current user, optionally scoped to one
   * child. A supplied `studentId` is revalidated server-side.
   */
  async getRequests(
    user: AuthenticatedUser,
    query: GetBookingRequestsQueryDto = {},
  ): Promise<BookingEntity[]> {
    const childIds = await this.guardianAccess.findActiveStudentIds(user.id);
    const allAllowedStudentIds = [user.id, ...childIds];

    if (query.studentId) {
      const allowed =
        isAdminRole(user) || query.studentId === user.id || childIds.includes(query.studentId);
      if (!allowed) {
        throw new ForbiddenException(
          'Access denied: You are not an active guardian of this student.',
        );
      }
    }

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'educationLevel')
      .leftJoinAndSelect('booking.requesterUser', 'requester')
      .leftJoinAndSelect('booking.studentUser', 'student')
      .leftJoinAndSelect('booking.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser');

    if (query.role === 'tutor') {
      qb.where('booking.tutorUserId = :userId', { userId: user.id });
    } else if (query.studentId) {
      qb.where('booking.studentUserId = :studentId', { studentId: query.studentId });
    } else {
      qb.where('booking.requesterUserId = :userId', { userId: user.id })
        .orWhere('booking.tutorUserId = :userId', { userId: user.id })
        .orWhere('booking.studentUserId IN (:...studentIds)', {
          studentIds: allAllowedStudentIds,
        });
    }

    if (query.studentId && query.role !== 'tutor') {
      qb.andWhere('booking.studentUserId = :studentId', { studentId: query.studentId });
    }
    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    return await qb.orderBy('booking.createdAt', 'DESC').getMany();
  }

  async getRequestById(requestId: string, user: AuthenticatedUser): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: requestId },
      relations: {
        subject: true,
        educationLevel: true,
        requesterUser: true,
        studentUser: true,
        tutorProfile: {
          user: true,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking request not found: ${requestId}`);
    }

    await this.guardianAccess.assertCanAccessBooking(
      user,
      booking,
      'Access denied: You are not authorized to view this booking request.',
    );
    return booking;
  }

  /** Append-only status history for one booking (authorized readers only). */
  async getStatusHistory(
    requestId: string,
    user: AuthenticatedUser,
  ): Promise<BookingStatusEventEntity[]> {
    await this.getRequestById(requestId, user);
    if (!this.statusEventRepo) return [];
    return this.statusEventRepo.find({
      where: { bookingId: requestId },
      order: { createdAt: 'ASC' },
    });
  }

  async withdrawRequest(
    requestId: string,
    requester: AuthenticatedUser,
    dto?: WithdrawBookingRequestDto,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findOne({ where: { id: requestId } });

    if (!booking) {
      throw new NotFoundException(`Booking request not found: ${requestId}`);
    }

    if (booking.requesterUserId !== requester.id) {
      throw new ForbiddenException('Only the requester can withdraw this booking request.');
    }

    if (booking.status !== 'requested') {
      throw new BadRequestException(
        `Only pending requests can be withdrawn (current status: '${booking.status}').`,
      );
    }

    const transition = applyBookingTransition(booking, 'cancelled', {
      actorUserId: requester.id,
      reason: dto?.reason,
    });

    booking.serviceAgreementSnapshot = {
      ...booking.serviceAgreementSnapshot,
      withdrawnReason: dto?.reason,
    };

    const saved = await this.bookingRepo.save(booking);

    await this.recordStatusEvent(saved.id, transition, {
      actorUserId: requester.id,
      actorRole: requester.roles?.[0] ?? 'student',
      reason: dto?.reason,
    });

    await this.auditService.record({
      actorUserId: requester.id,
      action: 'booking.request.withdrawn',
      resourceType: 'booking',
      resourceId: requestId,
      reason: dto?.reason,
    });

    if (this.notificationService) {
      try {
        await this.notificationService.dispatch({
          userId: booking.tutorUserId,
          eventType: 'booking.cancelled',
          recipientRole: 'tutor',
          payload: {
            bookingId: booking.id,
            reason: dto?.reason || 'Requester withdrew request',
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to dispatch booking.cancelled notification: ${err}`);
      }
    }

    return saved;
  }

  async respondToRequest(
    requestId: string,
    tutor: AuthenticatedUser,
    dto: RespondBookingRequestDto,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: requestId },
      relations: { subject: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking request not found: ${requestId}`);
    }

    if (booking.tutorUserId !== tutor.id) {
      throw new ForbiddenException(
        'Only the assigned tutor can accept or decline this booking request.',
      );
    }

    const tutorUser = await this.userRepo.findOne({ where: { id: tutor.id } });
    const tutorName = tutorUser?.displayName || 'Your Tutor';

    if (dto.action === 'accept') {
      // Paid bookings stop at awaiting_payment until a verified payment
      // confirms them. Zero-price bookings have no payment to wait for, so the
      // server confirms them directly through the transition map.
      const targetStatus = isZeroPriceBooking(booking.pricePerSessionMinor)
        ? 'confirmed'
        : 'awaiting_payment';
      const transition = applyBookingTransition(booking, targetStatus, {
        actorUserId: tutor.id,
        reason: dto.reasonNotes,
      });
      const saved = await this.bookingRepo.save(booking);
      await this.recordStatusEvent(saved.id, transition, {
        actorUserId: tutor.id,
        actorRole: 'tutor',
        reason: dto.reasonNotes,
      });
      await this.auditService.record({
        actorUserId: tutor.id,
        action: 'booking.request.accepted',
        resourceType: 'booking',
        resourceId: requestId,
        reason: dto.reasonNotes,
        safeMetadata: { targetStatus },
      });

      if (this.notificationService) {
        const recipientRole: 'student' | 'guardian' =
          booking.requesterUserId === booking.studentUserId ? 'student' : 'guardian';
        try {
          await this.notificationService.dispatch({
            userId: booking.requesterUserId,
            eventType: targetStatus === 'confirmed' ? 'booking.confirmed' : 'booking.accepted',
            recipientRole,
            payload: {
              bookingId: booking.id,
              tutorName,
              subjectName: booking.subject?.nameEn || 'Subject',
            },
          });
        } catch (err) {
          this.logger.warn(`Failed to dispatch booking response notification: ${err}`);
        }
      }
      return saved;
    }

    const transition = applyBookingTransition(booking, 'declined', {
      actorUserId: tutor.id,
      reason: dto.reasonNotes,
    });
    booking.serviceAgreementSnapshot = {
      ...booking.serviceAgreementSnapshot,
      declinedReason: dto.reasonNotes,
    };
    const saved = await this.bookingRepo.save(booking);

    await this.recordStatusEvent(saved.id, transition, {
      actorUserId: tutor.id,
      actorRole: 'tutor',
      reason: dto.reasonNotes,
    });

    await this.auditService.record({
      actorUserId: tutor.id,
      action: 'booking.request.declined',
      resourceType: 'booking',
      resourceId: requestId,
      reason: dto.reasonNotes,
    });

    if (this.notificationService) {
      const recipientRole: 'student' | 'guardian' =
        booking.requesterUserId === booking.studentUserId ? 'student' : 'guardian';
      try {
        await this.notificationService.dispatch({
          userId: booking.requesterUserId,
          eventType: 'booking.declined',
          recipientRole,
          payload: {
            bookingId: booking.id,
            tutorName,
            reason: dto.reasonNotes || 'Tutor unavailable',
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to dispatch booking response notification: ${err}`);
      }
    }

    return saved;
  }

  private async recordStatusEvent(
    bookingId: string,
    transition: { from: string | null; to: string; changed: boolean },
    context: {
      actorUserId?: string | null;
      actorRole?: string | null;
      reason?: string | null;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<void> {
    if (!this.statusEventRepo) return;
    try {
      await this.statusEventRepo.save(
        this.statusEventRepo.create(
          transitionHistoryValues(
            bookingId,
            transition as Parameters<typeof transitionHistoryValues>[1],
            context,
          ),
        ),
      );
    } catch (err) {
      // History must never break the primary transaction; log and continue.
      this.logger.warn(`Failed to record booking status event for ${bookingId}: ${err}`);
    }
  }
}
