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
import { BookingEntity, BookingStatus } from './entities/booking.entity';
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
  RespondBookingRequestDto,
  WithdrawBookingRequestDto,
} from './dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

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
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * Create an initial booking request from guardian or adult student
   * Enforces: Anti-spam duplicate prevention, unpublished tutor rejection,
   *           and relationship authorization.
   */
  async createRequest(
    requester: AuthenticatedUser,
    dto: CreateBookingRequestDto,
  ): Promise<BookingEntity> {
    // 1. Prevent requesting oneself
    if (dto.tutorId === requester.id || dto.tutorId === dto.studentId) {
      throw new BadRequestException('Cannot request tutoring sessions from yourself.');
    }

    // 2. Requester Relationship Verification
    const requesterUser = await this.userRepo.findOne({ where: { id: requester.id } });
    if (!requesterUser) {
      throw new NotFoundException('Requester account not found.');
    }

    if (requester.id !== dto.studentId) {
      // Must be an active guardian
      const activeLink = await this.linkRepo.findOne({
        where: {
          guardianUserId: requester.id,
          studentUserId: dto.studentId,
          status: 'active',
        },
      });

      if (!activeLink) {
        throw new ForbiddenException(
          'Access denied: You are not authorized to create requests for this student (no active guardian link).',
        );
      }
    }

    // 3. Target Tutor Verification & Publication Check
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

    // 4. Verify Subject and Level
    const subject = await this.subjectRepo.findOne({ where: { id: dto.subjectId } });
    if (!subject) {
      throw new NotFoundException(`Subject not found: ${dto.subjectId}`);
    }

    const level = await this.levelRepo.findOne({ where: { id: dto.educationLevelId } });
    if (!level) {
      throw new NotFoundException(`Education level not found: ${dto.educationLevelId}`);
    }

    // 5. Anti-Spam & Duplicate Request Invariant
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

    // 6. Pricing Determination
    const tutorSubject = await this.tutorSubjectRepo.findOne({
      where: {
        tutorUserId: dto.tutorId,
        subjectId: dto.subjectId,
      },
    });

    const priceMinor = tutorSubject?.rateMinor
      ? tutorSubject.rateMinor
      : tutorProfile.hourlyRateMinor || '50000'; // Default 500 BDT

    // 7. Persist Booking Entity
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

    const saved = await this.bookingRepo.save(booking);

    // 8. Global Audit Trail
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

    // 9. Dispatch In-App Notification to Tutor
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
   * List requests accessible to current user
   */
  async getRequests(user: AuthenticatedUser): Promise<BookingEntity[]> {
    // Collect all student IDs user can access as guardian
    const guardianLinks = await this.linkRepo.find({
      where: { guardianUserId: user.id, status: 'active' },
    });
    const childIds = guardianLinks.map((l) => l.studentUserId);

    const allAllowedStudentIds = [user.id, ...childIds];

    return await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'educationLevel')
      .leftJoinAndSelect('booking.requesterUser', 'requester')
      .leftJoinAndSelect('booking.studentUser', 'student')
      .where('booking.requesterUserId = :userId', { userId: user.id })
      .orWhere('booking.tutorUserId = :userId', { userId: user.id })
      .orWhere('booking.studentUserId IN (:...studentIds)', {
        studentIds: allAllowedStudentIds,
      })
      .orderBy('booking.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get single booking request with ownership guard
   */
  async getRequestById(requestId: string, user: AuthenticatedUser): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: requestId },
      relations: {
        subject: true,
        educationLevel: true,
        requesterUser: true,
        studentUser: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking request not found: ${requestId}`);
    }

    // Ownership check
    const isDirectParticipant =
      booking.requesterUserId === user.id ||
      booking.studentUserId === user.id ||
      booking.tutorUserId === user.id;

    if (isDirectParticipant) {
      return booking;
    }

    // Allow compliance admins
    if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) {
      return booking;
    }

    // Allow active guardian of student
    const activeLink = await this.linkRepo.findOne({
      where: {
        guardianUserId: user.id,
        studentUserId: booking.studentUserId,
        status: 'active',
      },
    });

    if (activeLink) {
      return booking;
    }

    throw new ForbiddenException(
      'Access denied: You are not authorized to view this booking request.',
    );
  }

  /**
   * Withdraw an active request (Requester only)
   */
  async withdrawRequest(
    requestId: string,
    requester: AuthenticatedUser,
    dto?: WithdrawBookingRequestDto,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findOne({ where: { id: requestId } });

    if (!booking) {
      throw new NotFoundException(`Booking request not found: ${requestId}`);
    }

    // Ownership guard: only requester can withdraw
    if (booking.requesterUserId !== requester.id) {
      throw new ForbiddenException('Only the requester can withdraw this booking request.');
    }

    if (booking.status !== 'requested') {
      throw new BadRequestException(
        `Cannot withdraw request in current status '${booking.status}'.`,
      );
    }

    booking.status = 'cancelled';
    booking.serviceAgreementSnapshot = {
      ...booking.serviceAgreementSnapshot,
      withdrawnReason: dto?.reason,
    };

    const saved = await this.bookingRepo.save(booking);

    await this.auditService.record({
      actorUserId: requester.id,
      action: 'booking.request.withdrawn',
      resourceType: 'booking',
      resourceId: requestId,
      reason: dto?.reason,
    });

    // Notify tutor of cancellation
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

  /**
   * Tutor responds to request (Accept or Decline)
   */
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

    // Ownership guard: only assigned tutor can respond
    if (booking.tutorUserId !== tutor.id) {
      throw new ForbiddenException(
        'Only the assigned tutor can accept or decline this booking request.',
      );
    }

    if (booking.status !== 'requested') {
      throw new BadRequestException(
        `Cannot respond to request in current status '${booking.status}'.`,
      );
    }

    const tutorUser = await this.userRepo.findOne({ where: { id: tutor.id } });
    const tutorName = tutorUser?.displayName || 'Your Tutor';

    if (dto.action === 'accept') {
      booking.status = 'accepted';
    } else {
      booking.status = 'declined';
      booking.serviceAgreementSnapshot = {
        ...booking.serviceAgreementSnapshot,
        declinedReason: dto.reasonNotes,
      };
    }

    const saved = await this.bookingRepo.save(booking);

    await this.auditService.record({
      actorUserId: tutor.id,
      action: dto.action === 'accept' ? 'booking.request.accepted' : 'booking.request.declined',
      resourceType: 'booking',
      resourceId: requestId,
      reason: dto.reasonNotes,
    });

    // Notify requester
    if (this.notificationService) {
      try {
        if (dto.action === 'accept') {
          await this.notificationService.dispatch({
            userId: booking.requesterUserId,
            eventType: 'booking.accepted',
            recipientRole: 'guardian',
            payload: {
              bookingId: booking.id,
              tutorName,
              subjectName: booking.subject?.nameEn || 'Subject',
            },
          });
        } else {
          await this.notificationService.dispatch({
            userId: booking.requesterUserId,
            eventType: 'booking.declined',
            recipientRole: 'guardian',
            payload: {
              bookingId: booking.id,
              tutorName,
              reason: dto.reasonNotes || 'Tutor unavailable',
            },
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to dispatch booking response notification: ${err}`);
      }
    }

    return saved;
  }
}
