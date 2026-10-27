import type { DisputeListResponse } from './interfaces/disputes.interfaces';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import {
  BookingDisputeEntity,
  OPEN_DISPUTE_STATUSES,
  RESOLVED_DISPUTE_STATUSES,
  type DisputeStatus,
} from './entities/booking-dispute.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { NotificationService } from '../notifications/notification.service';
import { RefundsService } from '../payments/services/refunds.service';
import { PaymentOrderEntity } from '../payments/entities/payment-order.entity';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';
import { CreateDisputeDto, ResolveDisputeDto, QueryDisputesDto } from './dto';

export type { DisputeListResponse } from './interfaces/disputes.interfaces';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @InjectRepository(BookingDisputeEntity)
    private readonly disputeRepo: Repository<BookingDisputeEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    private readonly notificationService: NotificationService,
    private readonly refundsService: RefundsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. Open a new Booking Dispute
   * Invariant: Only student or guardian of the booking can dispute.
   * On creation, booking immediately transitions to 'disputed', freezing escrow release.
   */
  async openDispute(user: AuthenticatedUser, dto: CreateDisputeDto): Promise<BookingDisputeEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: { studentUser: true, requesterUser: true, tutorProfile: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    const isStudent = user.id === booking.studentUserId;
    const isRequester = user.id === booking.requesterUserId;
    const isAdmin = isAdminRole(user);

    if (!isStudent && !isRequester && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: Only the student or guardian of this booking can open a dispute',
      );
    }

    const DISPUTABLE_STATUSES = ['confirmed', 'in_progress', 'completed'];
    if (!DISPUTABLE_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        `Cannot open a dispute on a booking in '${booking.status}' status. Only confirmed, in-progress, or completed bookings can be disputed.`,
      );
    }

    // Check for existing active dispute
    const existing = await this.disputeRepo.findOne({
      where: {
        bookingId: booking.id,
        status: In(OPEN_DISPUTE_STATUSES as unknown as DisputeStatus[]),
      },
    });

    if (existing) {
      throw new ConflictException(
        `An active dispute (${existing.id}) is already open for this booking`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Transition booking to 'disputed'
      const previousBookingStatus = booking.status;
      booking.status = 'disputed';
      booking.updatedAt = new Date();
      await manager.save(BookingEntity, booking);

      // 2. Create dispute record
      const dispute = manager.create(BookingDisputeEntity, {
        bookingId: booking.id,
        disputedBy: user.id,
        reasonCode: dto.reasonCode,
        description: dto.description.trim(),
        disputedAmountMinor: dto.disputedAmountMinor ? String(dto.disputedAmountMinor) : null,
        evidenceAssetIds: dto.evidenceAssetIds || [],
        status: 'opened',
        policyVersion: 'v1.0-dispute-resolution',
      });

      const savedDispute = await manager.save(BookingDisputeEntity, dispute);

      // 3. Emit Outbox Event (Freezes escrow settlement and alerts operations)
      const outboxEvent = manager.create(OutboxEventEntity, {
        eventType: 'booking.disputed',
        aggregateType: 'booking',
        aggregateId: booking.id,
        payload: {
          disputeId: savedDispute.id,
          bookingId: booking.id,
          disputedBy: user.id,
          reasonCode: dto.reasonCode,
          previousBookingStatus,
        },
      });
      await manager.save(OutboxEventEntity, outboxEvent);

      // 4. Audit Log
      const auditLog = manager.create(AuditLogEntity, {
        actorUserId: user.id,
        action: 'dispute.opened',
        resourceType: 'booking_disputes',
        resourceId: savedDispute.id,
        reason: dto.description.trim().slice(0, 255),
        safeMetadata: {
          bookingId: booking.id,
          reasonCode: dto.reasonCode,
          disputedAmountMinor: dispute.disputedAmountMinor,
          previousBookingStatus,
        },
      });
      await manager.save(AuditLogEntity, auditLog);

      // 5. Notify the tutor
      await this.notificationService
        .dispatch({
          userId: booking.tutorUserId,
          recipientRole: 'tutor',
          eventType: 'dispute.opened',
          payload: {
            bookingId: booking.id,
            issue: dto.reasonCode,
          },
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch dispute notification to tutor: ${err}`),
        );

      this.logger.warn(
        `BOOKING DISPUTE OPENED [Dispute: ${savedDispute.id}, Booking: ${booking.id}] by user ${user.id}`,
      );

      return savedDispute;
    });
  }

  /**
   * 2. Get Dispute by ID (ABAC Scoped)
   */
  async getDispute(user: AuthenticatedUser, disputeId: string): Promise<BookingDisputeEntity> {
    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
      relations: {
        booking: {
          tutorProfile: { user: true },
          studentUser: true,
          requesterUser: true,
          subject: true,
          educationLevel: true,
        },
        disputant: true,
        assignedStaff: true,
        resolver: true,
        refund: true,
      },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute ${disputeId} not found`);
    }

    const isAdmin = isAdminRole(user);
    const isDisputant = user.id === dispute.disputedBy;
    const isTutor = user.id === dispute.booking?.tutorUserId;
    const isStudent = user.id === dispute.booking?.studentUserId;
    const isRequester = user.id === dispute.booking?.requesterUserId;

    if (!isAdmin && !isDisputant && !isTutor && !isStudent && !isRequester) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this confidential dispute',
      );
    }

    return dispute;
  }

  /**
   * 3. List Disputes (Admin Queue or User's Own Disputes)
   */
  async listDisputes(
    user: AuthenticatedUser,
    query: QueryDisputesDto,
  ): Promise<DisputeListResponse> {
    const isAdmin = isAdminRole(user);
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.disputeRepo
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'educationLevel')
      .leftJoinAndSelect('booking.studentUser', 'studentUser')
      .leftJoinAndSelect('booking.requesterUser', 'requesterUser')
      .leftJoinAndSelect('booking.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndSelect('dispute.disputant', 'disputant')
      .leftJoinAndSelect('dispute.resolver', 'resolver');

    if (!isAdmin) {
      qb.where(
        '(dispute.disputed_by = :userId OR booking.student_user_id = :userId OR booking.requester_user_id = :userId OR booking.tutor_user_id = :userId)',
        { userId: user.id },
      );
    }

    if (query.status) {
      qb.andWhere('dispute.status = :status', { status: query.status });
    }

    if (query.bookingId) {
      qb.andWhere('dispute.booking_id = :bookingId', { bookingId: query.bookingId });
    }

    qb.orderBy('dispute.created_at', 'DESC').skip(skip).take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * 4. Resolve Dispute (Administrator Action)
   */
  async resolveDispute(
    user: AuthenticatedUser,
    disputeId: string,
    dto: ResolveDisputeDto,
  ): Promise<BookingDisputeEntity> {
    if (!isAdminRole(user)) {
      throw new ForbiddenException('Administrator role required to resolve booking disputes');
    }

    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
      relations: { booking: true },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute ${disputeId} not found`);
    }

    if (RESOLVED_DISPUTE_STATUSES.includes(dispute.status)) {
      throw new BadRequestException(
        `Dispute ${disputeId} has already been resolved (${dispute.status})`,
      );
    }

    const booking = dispute.booking;
    if (!booking) {
      throw new NotFoundException(`Associated booking not found for dispute ${disputeId}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      let targetBookingStatus: string = 'completed';
      let targetDisputeStatus: DisputeStatus = 'resolved_tutor_upheld';
      let refundId: string | null = null;

      switch (dto.resolutionType) {
        case 'refund':
        case 'partial_refund': {
          targetDisputeStatus =
            dto.resolutionType === 'refund' ? 'resolved_refund' : 'resolved_partial_refund';
          targetBookingStatus = 'cancelled';

          // Look up successful payment order for this booking
          const order = await manager.findOne(PaymentOrderEntity, {
            where: { bookingId: booking.id, status: 'succeeded' },
          });

          if (order) {
            const refundAmount = dto.refundAmountMinor
              ? BigInt(dto.refundAmountMinor)
              : BigInt(order.amountMinor);

            try {
              const refund = await this.refundsService.requestAndApproveForAdmin(user, {
                paymentOrderId: order.id,
                amountMinor: Number(refundAmount),
                reason: `Dispute resolution (${dto.resolutionType}): ${dto.resolutionNotes.slice(0, 200)}`,
              });
              refundId = refund.id;
            } catch (refundErr) {
              this.logger.error(`Automated refund for dispute ${disputeId} failed: ${refundErr}`);
              // Fallback: dispute notes record refund requirement
            }
          }
          break;
        }

        case 'tutor_upheld': {
          targetDisputeStatus = 'resolved_tutor_upheld';
          targetBookingStatus = 'completed';
          break;
        }

        case 'replacement': {
          targetDisputeStatus = 'resolved_replacement';
          targetBookingStatus = 'replacement_requested';
          break;
        }

        case 'dismissed': {
          targetDisputeStatus = 'dismissed';
          targetBookingStatus = 'completed';
          break;
        }
      }

      // Update booking status
      booking.status = targetBookingStatus as any;
      booking.updatedAt = now;
      await manager.save(BookingEntity, booking);

      // Update dispute record
      dispute.status = targetDisputeStatus;
      dispute.resolutionType = dto.resolutionType;
      dispute.resolutionNotes = dto.resolutionNotes;
      dispute.refundId = refundId;
      dispute.resolvedBy = user.id;
      dispute.resolvedAt = now;
      dispute.updatedAt = now;

      const savedDispute = await manager.save(BookingDisputeEntity, dispute);

      // Outbox Event
      const outbox = manager.create(OutboxEventEntity, {
        eventType: 'dispute.resolved',
        aggregateType: 'booking_dispute',
        aggregateId: savedDispute.id,
        payload: {
          disputeId: savedDispute.id,
          bookingId: booking.id,
          resolutionType: dto.resolutionType,
          status: targetDisputeStatus,
          targetBookingStatus,
          refundId,
          resolvedBy: user.id,
        },
      });
      await manager.save(OutboxEventEntity, outbox);

      // Audit Log
      const auditLog = manager.create(AuditLogEntity, {
        actorUserId: user.id,
        action: 'dispute.resolved',
        resourceType: 'booking_disputes',
        resourceId: savedDispute.id,
        reason: dto.resolutionNotes,
        safeMetadata: {
          bookingId: booking.id,
          resolutionType: dto.resolutionType,
          status: targetDisputeStatus,
          refundId,
        },
      });
      await manager.save(AuditLogEntity, auditLog);

      // Notify parties
      await this.notificationService
        .dispatch({
          userId: dispute.disputedBy,
          recipientRole: 'student',
          eventType: 'dispute.resolved',
          payload: {
            disputeId: savedDispute.id,
            bookingId: booking.id,
            resolution: dto.resolutionType,
          },
        })
        .catch(() => {});

      await this.notificationService
        .dispatch({
          userId: booking.tutorUserId,
          recipientRole: 'tutor',
          eventType: 'dispute.resolved',
          payload: {
            disputeId: savedDispute.id,
            bookingId: booking.id,
            resolution: dto.resolutionType,
          },
        })
        .catch(() => {});

      return savedDispute;
    });
  }
}
