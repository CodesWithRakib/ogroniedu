import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { TutorReplacementCaseEntity } from '../../trust/entities/tutor-replacement-case.entity';
import { SafetyReportEntity } from '../../trust/entities/safety-report.entity';
import { BookingDisputeEntity } from '../../trust/entities/booking-dispute.entity';
import { PaymentOrderEntity } from '../../payments/entities/payment-order.entity';
import { EscrowHoldEntity } from '../../payments/entities/escrow-hold.entity';
import { InvoiceEntity } from '../../payments/entities/invoice.entity';
import { LedgerJournalEntity } from '../../payments/entities/ledger-journal.entity';
import { PaymentRefundEntity } from '../../payments/entities/payment-refund.entity';
import { AuditService } from '../../audit/audit.service';
import { RefundsService } from '../../payments/services/refunds.service';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AdminCancelBookingDto, AssignSupportCaseDto } from '../dto';

/**
 * Bookings operations, emergency cancellation with escrow reversal,
 * and support case assignment.
 */
@Injectable()
export class AdminBookingsService {
  private readonly logger = new Logger(AdminBookingsService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TutorReplacementCaseEntity)
    private readonly replacementCaseRepo: Repository<TutorReplacementCaseEntity>,
    @InjectRepository(SafetyReportEntity)
    private readonly safetyReportRepo: Repository<SafetyReportEntity>,
    @InjectRepository(PaymentOrderEntity)
    private readonly paymentOrderRepo: Repository<PaymentOrderEntity>,
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(RefundsService)
    private readonly refundsService: RefundsService,
  ) {}

  /**
   * 7. Bookings Management & Emergency Administrative Cancellation with Ledger Escrow Reversal
   */
  async listAllBookings(query: {
    status?: string;
    studentId?: string;
    tutorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ bookings: BookingEntity[]; total: number }> {
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.requesterUser', 'requester')
      .leftJoinAndSelect('booking.studentUser', 'student')
      .leftJoinAndSelect('booking.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'level')
      .orderBy('booking.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }
    if (query.studentId) {
      qb.andWhere('booking.studentUserId = :studentId', { studentId: query.studentId });
    }
    if (query.tutorId) {
      qb.andWhere('booking.tutorUserId = :tutorId', { tutorId: query.tutorId });
    }

    const [bookings, total] = await qb.getManyAndCount();
    return { bookings, total };
  }

  async getBookingDetail(bookingId: string) {
    const booking = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.requesterUser', 'requester')
      .leftJoinAndSelect('booking.studentUser', 'student')
      .leftJoinAndSelect('booking.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'level')
      .where('booking.id = :bookingId', { bookingId })
      .getOne();

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const sessions = await this.bookingRepo.manager.find(BookingSessionEntity, {
      where: { bookingId },
      order: { startsAt: 'ASC' },
    });

    const escrowHolds = await this.bookingRepo.manager.find(EscrowHoldEntity, {
      where: { bookingId },
      order: { createdAt: 'ASC' },
    });

    const paymentOrders = await this.bookingRepo.manager.find(PaymentOrderEntity, {
      where: { bookingId },
      relations: { transactions: true },
      order: { createdAt: 'ASC' },
    });

    const invoices = await this.bookingRepo.manager.find(InvoiceEntity, {
      where: { bookingId },
      order: { issuedAt: 'ASC' },
    });

    const sourceIds = [bookingId, ...paymentOrders.map((o) => o.id), ...sessions.map((s) => s.id)];
    const journals = await this.bookingRepo.manager.find(LedgerJournalEntity, {
      where: { sourceId: In(sourceIds) },
      relations: { entries: { account: true } },
      order: { postedAt: 'ASC' },
    });

    const refunds = await this.bookingRepo.manager.find(PaymentRefundEntity, {
      where: { bookingId },
      order: { createdAt: 'ASC' },
    });

    const replacementCase = await this.replacementCaseRepo.findOne({
      where: { bookingId },
      relations: { requester: true, replacementTutor: true, assignee: true },
    });

    const dispute = await this.bookingRepo.manager.findOne(BookingDisputeEntity, {
      where: { bookingId },
    });

    return {
      booking,
      sessions,
      escrowHolds,
      paymentOrders,
      invoices,
      journals,
      refunds,
      replacementCase,
      dispute,
    };
  }

  async adminCancelBooking(
    adminUser: AuthenticatedUser,
    bookingId: string,
    dto: AdminCancelBookingDto,
  ): Promise<{
    booking: BookingEntity;
    refundIssued: boolean;
    refundStatus: string | null;
    refundId: string | null;
  }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking is already cancelled');
    }

    const previousStatus = booking.status;
    booking.status = 'cancelled';
    booking.serviceAgreementSnapshot = {
      ...booking.serviceAgreementSnapshot,
      administrativeIntervention: {
        cancelledBy: adminUser.id,
        reason: dto.reason,
        timestamp: new Date().toISOString(),
      },
    };

    const savedBooking = await this.bookingRepo.save(booking);

    // Record privileged action audit log
    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.booking.emergency_cancelled',
      resourceType: 'bookings',
      resourceId: bookingId,
      reason: dto.reason,
      safeMetadata: { previousStatus, refundStudent: dto.refundStudent },
    });

    let refundIssued = false;
    let refundStatus: string | null = null;
    let refundId: string | null = null;

    // Escrow reversal is a finance workflow, not an instant side effect. The
    // request is auto-approved here, but money is only reported as refunded
    // after provider/manual confirmation succeeds.
    if (dto.refundStudent) {
      const order = await this.paymentOrderRepo.findOne({
        where: { bookingId, status: 'succeeded' },
      });

      if (order) {
        try {
          const refund = await this.refundsService.requestAndApproveForAdmin(adminUser, {
            paymentOrderId: order.id,
            amountMinor: Number(order.amountMinor),
            reason: `Admin emergency intervention: ${dto.reason}`,
          });
          refundId = refund.id;
          refundStatus = refund.status;
          refundIssued = refund.status === 'succeeded';
          this.logger.log(
            `Administrative refund ${refund.refundNumber ?? refund.id} for order ${order.id} is ${refund.status}; confirmation is pending in the finance queue`,
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Administrative refund failed for booking ${bookingId}: ${message}`);
        }
      }
    }

    return { booking: savedBooking, refundIssued, refundStatus, refundId };
  }

  /**
   * 8. Support Case Assignment: Assign support agents to tutor replacement / safety cases
   */
  async assignCase(
    adminUser: AuthenticatedUser,
    dto: AssignSupportCaseDto,
  ): Promise<{ success: boolean; message: string }> {
    const agent = await this.userRepo.findOne({ where: { id: dto.assignedToUserId } });
    if (!agent) {
      throw new NotFoundException(`Support user ${dto.assignedToUserId} not found`);
    }

    if (dto.caseType === 'replacement') {
      const repCase = await this.replacementCaseRepo.findOne({ where: { id: dto.caseId } });
      if (!repCase) throw new NotFoundException(`Replacement case ${dto.caseId} not found`);
      repCase.outcomeNotes = dto.notes
        ? `${repCase.outcomeNotes || ''}\nAssigned: ${dto.notes}`
        : repCase.outcomeNotes;
      await this.replacementCaseRepo.save(repCase);
    } else if (dto.caseType === 'safety') {
      const safetyCase = await this.safetyReportRepo.findOne({ where: { id: dto.caseId } });
      if (!safetyCase) throw new NotFoundException(`Safety report ${dto.caseId} not found`);
      safetyCase.resolutionNotes = dto.notes
        ? `${safetyCase.resolutionNotes || ''}\nAssigned: ${dto.notes}`
        : safetyCase.resolutionNotes;
      await this.safetyReportRepo.save(safetyCase);
    }

    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.case.assigned',
      resourceType: dto.caseType,
      resourceId: dto.caseId,
      reason: dto.notes,
      safeMetadata: { assignedToUserId: dto.assignedToUserId, caseType: dto.caseType },
    });

    return {
      success: true,
      message: `Case ${dto.caseId} successfully assigned to ${agent.displayName}.`,
    };
  }
}
