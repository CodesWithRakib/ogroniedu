import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrderEntity, PaymentTransactionEntity, LedgerJournalEntity } from '../entities';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { LedgerService } from '../ledger.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { SettleMilestoneDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';

export interface ReconciliationReport {
  reconciledAt: string;
  totalOrders: number;
  succeededOrders: number;
  totalTransactions: number;
  isLedgerBalanced: boolean;
  ledgerTotalDebitsPoisha: string;
  ledgerTotalCreditsPoisha: string;
  unreconciledDiscrepancies: Array<{ orderId: string; reason: string }>;
}

/**
 * Post-payment settlement: session milestone escrow split (92% tutor
 * payable / 8% platform fee) plus the financial reconciliation audit
 * of orders vs ledger vs provider transactions.
 */
@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly transactionRepo: Repository<PaymentTransactionEntity>,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * 4. Settle Session Milestone (Escrow -> Tutor Payable 92% + Platform 8% Commission)
   * Invariant: Only the student, guardian, or admin can approve escrow milestone settlement.
   */
  async settleMilestone(
    user: AuthenticatedUser,
    dto: SettleMilestoneDto,
    requestId?: string,
  ): Promise<LedgerJournalEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
      relations: { booking: true },
    });

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    if (session.status !== 'completed') {
      throw new BadRequestException('Only completed sessions can be settled');
    }

    const booking = session.booking;
    if (!booking) {
      throw new NotFoundException('Associated booking not found');
    }

    // ABAC Verification: user must be student, requester guardian, or admin
    const isParticipant =
      user.id === booking.studentUserId || user.id === booking.requesterUserId || isAdminRole(user);
    if (!isParticipant) {
      throw new ForbiddenException(
        'Access denied: Only the student, guardian, or an administrator can approve session milestone settlement',
      );
    }

    const totalMinor = BigInt(booking.pricePerSessionMinor);
    // Platform charges 8% commission on lesson bookings (docs/audits/architecture-decisions-needed.md)
    const platformCommissionMinor = (totalMinor * 8n) / 100n;
    const tutorPayableMinor = totalMinor - platformCommissionMinor; // 92%

    // Post double-entry settlement journal
    // Debit: 2100 Student Escrow Deposit -> totalMinor
    // Credit: 2000 Tutor Earnings Payable Liability -> tutorPayableMinor (92%)
    // Credit: 4000 Tutoring Platform Service Fee Revenue -> platformCommissionMinor (8%)
    const journal = await this.ledgerService.postJournal({
      sourceType: 'session_milestone',
      sourceId: session.id,
      idempotencyKey: `ledger:settlement:session:${session.id}`,
      description: `Settlement for session #${session.id}: 92% tutor payout, 8% platform service fee`,
      createdBy: user.id,
      entries: [
        { accountCode: '2100', direction: 'debit', amountMinor: totalMinor },
        { accountCode: '2000', direction: 'credit', amountMinor: tutorPayableMinor },
        { accountCode: '4000', direction: 'credit', amountMinor: platformCommissionMinor },
      ],
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'payment.milestone_settled',
      resourceType: 'booking_sessions',
      resourceId: session.id,
      requestId,
      safeMetadata: {
        sessionId: session.id,
        totalMinor: totalMinor.toString(),
        tutorPayableMinor: tutorPayableMinor.toString(),
        platformCommissionMinor: platformCommissionMinor.toString(),
      },
    });

    // Notify tutor of credited milestone payout
    if (booking.tutorUserId && this.notificationService) {
      await this.notificationService
        .dispatch({
          userId: booking.tutorUserId,
          recipientRole: 'tutor',
          eventType: 'payment.succeeded',
          payload: {
            bookingId: booking.id,
            amount: `${(Number(tutorPayableMinor) / 100).toFixed(2)} BDT`,
          },
        })
        .catch(() => {});
    }

    return journal;
  }

  /**
   * 6. Financial Reconciliation Audit: Orders vs Ledger vs Bank/MFS Transactions
   */
  async runReconciliation(): Promise<ReconciliationReport> {
    const orders = await this.orderRepo.find();
    const transactions = await this.transactionRepo.find();
    const ledgerIntegrity = await this.ledgerService.verifySystemLedgerIntegrity();

    const succeededOrders = orders.filter((o) => o.status === 'succeeded');
    const discrepancies: Array<{ orderId: string; reason: string }> = [];

    // Verify each succeeded order has a matching succeeded transaction
    for (const order of succeededOrders) {
      const match = transactions.find(
        (t) => t.paymentOrderId === order.id && t.status === 'succeeded',
      );
      if (!match) {
        discrepancies.push({
          orderId: order.id,
          reason: 'Succeeded payment order has no verified transaction record',
        });
      }
    }

    if (!ledgerIntegrity.isBalanced) {
      discrepancies.push({
        orderId: 'SYSTEM_LEDGER',
        reason: `System ledger is unbalanced by ${ledgerIntegrity.discrepancy} poisha`,
      });
    }

    return {
      reconciledAt: new Date().toISOString(),
      totalOrders: orders.length,
      succeededOrders: succeededOrders.length,
      totalTransactions: transactions.length,
      isLedgerBalanced: ledgerIntegrity.isBalanced,
      ledgerTotalDebitsPoisha: ledgerIntegrity.totalDebits.toString(),
      ledgerTotalCreditsPoisha: ledgerIntegrity.totalCredits.toString(),
      unreconciledDiscrepancies: discrepancies,
    };
  }
}
