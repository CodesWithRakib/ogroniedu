import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsWhere } from 'typeorm';
import { ReviewEntity } from './entities/review.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { NotificationService } from '../notifications/notification.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';
import { CreateReviewDto, TutorReplyDto, ModerateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  // Basic toxicity / profanity inspection regex
  private readonly toxicContentRegex =
    /\b(?:scam|fraud|thief|cheat|abuse|bastard|খুনি|প্রতারক|বাটপার)\b/i;

  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
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
   * 1. Submit a Fair, Verified Review
   * Invariants:
   * - Reviewer must be booking participant (student or guardian).
   * - Tutors CANNOT self-review.
   * - Booking must be in eligible state ('completed' or 'confirmed').
   * - Unique review per booking and reviewer (no duplicate reviews).
   */
  async createReview(user: AuthenticatedUser, dto: CreateReviewDto): Promise<ReviewEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    // tutorUserId is a column; tutorProfile is the optional loaded relation.
    const tutorUserId = booking.tutorUserId || booking.tutorProfile?.userId;

    if (!tutorUserId) {
      throw new NotFoundException('Tutor not found for this booking');
    }

    // Anti-Self Review Invariant: Tutor cannot review themselves
    if (user.id === tutorUserId) {
      throw new ForbiddenException('Tutors cannot review their own sessions');
    }

    // Participant Scoping (Anti-Fake Review): Must be student or guardian
    const isStudent = user.id === booking.studentUserId;
    const isRequester = user.id === booking.requesterUserId;
    if (!isStudent && !isRequester) {
      throw new ForbiddenException(
        'Only the student or guardian of this confirmed booking can submit a review',
      );
    }

    // Eligible Booking Status
    const eligibleStatuses = ['completed', 'confirmed', 'in_progress'];
    if (!eligibleStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Booking status '${booking.status}' is not eligible for review. Must be confirmed or completed.`,
      );
    }

    // Duplicate Review Check
    const existing = await this.reviewRepo.findOne({
      where: { bookingId: dto.bookingId, reviewerUserId: user.id },
    });
    if (existing) {
      throw new ConflictException(
        'A review has already been submitted for this booking by this user',
      );
    }

    // Content Safety / Moderation flag
    const isFlagged = this.toxicContentRegex.test(dto.comment);
    const moderationStatus = isFlagged ? 'flagged' : 'published';

    const review = this.reviewRepo.create({
      bookingId: dto.bookingId,
      reviewerUserId: user.id,
      tutorUserId,
      rating: dto.rating,
      punctualityRating: dto.punctualityRating,
      teachingClarityRating: dto.teachingClarityRating,
      subjectMasteryRating: dto.subjectMasteryRating,
      comment: dto.comment,
      moderationStatus,
      isVerifiedBooking: true,
      policyVersion: 'v1.0-fair-reviews',
    });

    const savedReview = await this.reviewRepo.save(review);

    // Record Audit Log
    const auditLog = this.auditRepo.create({
      actorUserId: user.id,
      action: 'review.created',
      resourceType: 'reviews',
      resourceId: savedReview.id,
      safeMetadata: {
        bookingId: booking.id,
        tutorUserId,
        rating: dto.rating,
        moderationStatus,
      },
    });
    await this.auditRepo
      .save(auditLog)
      .catch((err) => this.logger.warn(`Failed to persist audit log for review: ${err}`));

    // Emit Outbox Event
    const outboxEvent = this.outboxRepo.create({
      eventType: 'review.created',
      aggregateType: 'review',
      aggregateId: savedReview.id,
      payload: {
        reviewId: savedReview.id,
        bookingId: booking.id,
        tutorUserId,
        rating: dto.rating,
        moderationStatus,
      },
    });
    await this.outboxRepo
      .save(outboxEvent)
      .catch((err) => this.logger.warn(`Failed to emit outbox event for review: ${err}`));

    // Notify reviewed tutor
    await this.notificationService
      .dispatch({
        userId: tutorUserId,
        recipientRole: 'tutor',
        eventType: 'system.announcement',
        payload: {
          reviewId: savedReview.id,
          rating: dto.rating,
          message: 'A student has submitted a new review for your tutoring course.',
        },
      })
      .catch((err) => this.logger.warn(`Failed to dispatch review notification to tutor: ${err}`));

    return savedReview;
  }

  /**
   * 2. Get Published Reviews for a Tutor
   */
  async getTutorReviews(tutorUserId: string, includeAll = false): Promise<ReviewEntity[]> {
    const where: FindOptionsWhere<ReviewEntity> = includeAll
      ? { tutorUserId }
      : { tutorUserId, moderationStatus: 'published' };

    return this.reviewRepo.find({
      where,
      relations: { reviewer: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 3. Tutor Rebuttal / Single Response
   */
  async replyToReview(
    user: AuthenticatedUser,
    reviewId: string,
    dto: TutorReplyDto,
  ): Promise<ReviewEntity> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    // Only reviewed tutor can reply
    if (user.id !== review.tutorUserId) {
      throw new ForbiddenException('Only the reviewed tutor can submit a response to this review');
    }

    // Only one response allowed
    if (review.tutorResponse) {
      throw new ConflictException('A formal response has already been submitted for this review');
    }

    review.tutorResponse = dto.reply;
    review.tutorRespondedAt = new Date();
    const updated = await this.reviewRepo.save(review);

    // Audit log
    await this.auditRepo
      .save(
        this.auditRepo.create({
          actorUserId: user.id,
          action: 'review.replied',
          resourceType: 'reviews',
          resourceId: review.id,
          safeMetadata: { tutorUserId: user.id },
        }),
      )
      .catch((err) => this.logger.warn(`Failed to persist audit log for review reply: ${err}`));

    return updated;
  }

  /**
   * 4. Moderate Review (Admin only)
   */
  async moderateReview(
    user: AuthenticatedUser,
    reviewId: string,
    dto: ModerateReviewDto,
  ): Promise<ReviewEntity> {
    if (!isAdminRole(user)) {
      throw new ForbiddenException('Admin privileges required to moderate reviews');
    }

    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    const oldStatus = review.moderationStatus;
    review.moderationStatus = dto.status;
    const updated = await this.reviewRepo.save(review);

    await this.auditRepo
      .save(
        this.auditRepo.create({
          actorUserId: user.id,
          action: 'review.moderated',
          resourceType: 'reviews',
          resourceId: review.id,
          reason: dto.reason || 'Admin moderation update',
          safeMetadata: { oldStatus, newStatus: dto.status },
        }),
      )
      .catch((err) => this.logger.warn(`Failed to persist audit log for moderation: ${err}`));

    return updated;
  }
}
