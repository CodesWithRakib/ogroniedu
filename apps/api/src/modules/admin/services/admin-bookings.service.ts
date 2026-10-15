import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { TutorReplacementCaseEntity } from '../../trust/entities/tutor-replacement-case.entity';
import { SafetyReportEntity } from '../../trust/entities/safety-report.entity';
import { PaymentOrderEntity } from '../../payments/entities/payment-order.entity';
import { AuditService } from '../../audit/audit.service';
import { PaymentsService } from '../../payments/payments.service';
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
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
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

  async adminCancelBooking(
    adminUser: AuthenticatedUser,
    bookingId: string,
    dto: AdminCancelBookingDto,
  ): Promise<{ booking: BookingEntity; refundIssued: boolean }> {
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

    // Optional escrow reversal / refund execution
    if (dto.refundStudent) {
      const order = await this.paymentOrderRepo.findOne({
        where: { bookingId, status: 'succeeded' },
      });

      if (order) {
        try {
          await this.paymentsService.processRefund(
            adminUser,
            {
              paymentOrderId: order.id,
              amountMinor: Number(order.amountMinor),
              reason: `Admin emergency intervention: ${dto.reason}`,
            },
            `admin-refund-${bookingId}-${Date.now()}`,
          );
          refundIssued = true;
          this.logger.log(
            `Administrative refund issued for order ${order.id} on booking ${bookingId}`,
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Administrative refund failed for booking ${bookingId}: ${message}`);
        }
      }
    }

    return { booking: savedBooking, refundIssued };
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
