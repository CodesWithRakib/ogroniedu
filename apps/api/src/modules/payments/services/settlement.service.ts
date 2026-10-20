import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  PaymentOrderEntity,
  PaymentTransactionEntity,
  PaymentRefundEntity,
  PayoutEntity,
  LedgerJournalEntity,
  EscrowHoldEntity,
  SessionSettlementEntity,
  TutorFinancialAccountEntity,
  ReconciliationRunEntity,
} from '../entities';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { LedgerService } from '../ledger.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { SettleMilestoneDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { parseMinor, splitCommission } from '../../../common/money/money';

export interface ReconciliationReport {
  runId: string | null;
  reconciledAt: string;
  totalOrders: number;
  succeededOrders: number;
  totalTransactions: number;
  totalRefunds: number;
  totalPayouts: number;
  isLedgerBalanced: boolean;
  ledgerTotalDebitsPoisha: string;
  ledgerTotalCreditsPoisha: string;
  unreconciledDiscrepancies: Array<{ reference: string; reason: string }>;
}

/**
 * Post-payment settlement. A completed session releases funds from a specific
 * escrow hold; the hold's snapshotted commission rate is used so historical
 * settlements are never reinterpreted by a later policy change.
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly transactionRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(EscrowHoldEntity)
    private readonly escrowRepo: Repository<EscrowHoldEntity>,
    @InjectRepository(SessionSettlementEntity)
    private readonly settlementRepo: Repository<SessionSettlementEntity>,
    @InjectRepository(PaymentRefundEntity)
    private readonly refundRepo: Repository<PaymentRefundEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payoutRepo: Repository<PayoutEntity>,
    @InjectRepository(ReconciliationRunEntity)
    private readonly reconciliationRepo: Repository<ReconciliationRunEntity>,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService?: NotificationService,
  ) {}

  async settleMilestone(
    user: AuthenticatedUser,
    dto: SettleMilestoneDto,
    requestId?: string,
  ): Promise<LedgerJournalEntity> {
    const result = await this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(BookingSessionEntity, {
        where: { id: dto.sessionId },
        relations: { booking: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException(`Session ${dto.sessionId} not found`);
      if (session.status !== 'completed') {
        throw new BadRequestException('Only completed sessions can be settled');
      }

      const booking = session.booking;
      if (!booking) throw new NotFoundException('Associated booking not found');

      if (booking.status === 'disputed') {
        throw new BadRequestException(
          'Settlement blocked: Associated booking is currently in disputed status. Resolve dispute before settling milestone.',
        );
      }

      const isParticipant =
        user.id === booking.studentUserId ||
        user.id === booking.requesterUserId ||
        isAdminRole(user);
      if (!isParticipant) {
        throw new ForbiddenException(
          'Access denied: only the student, requester, or an administrator can approve settlement',
        );
      }

      const existing = await manager.findOne(SessionSettlementEntity, {
        where: { sessionId: session.id },
      });
      if (existing) {
        const journal = await manager.findOne(LedgerJournalEntity, {
          where: { id: existing.journalId },
          relations: { entries: { account: true } },
        });
        if (journal) return { journal, settlement: existing, idempotent: true };
      }

      const gross = parseMinor(booking.pricePerSessionMinor);
      if (gross <= 0n) {
        throw new BadRequestException('Booking has no payable session amount');
      }

      const hold = await manager
        .createQueryBuilder(EscrowHoldEntity, 'hold')
        .where('hold.booking_id = :bookingId', { bookingId: booking.id })
        .andWhere("hold.status IN ('held', 'partially_released')")
        .orderBy('hold.held_at', 'ASC')
        .setLock('pessimistic_write')
        .getOne();

      if (!hold) {
        throw new ConflictException(
          'No funded escrow hold is available for this booking. The booking must be paid before settlement.',
        );
      }

      const remaining =
        BigInt(hold.amountMinor) - BigInt(hold.releasedMinor) - BigInt(hold.refundedMinor);
      if (remaining < gross) {
        throw new ConflictException(
          `Escrow hold cannot cover this session (remaining ${remaining.toString()} poisha, required ${gross.toString()}). Additional funding is required for another session.`,
        );
      }

      const { platformFeeMinor, tutorNetMinor } = splitCommission(gross, hold.commissionRateBps);

      const journal = await this.ledgerService.postJournal(
        {
          sourceType: 'session_milestone',
          sourceId: session.id,
          idempotencyKey: `ledger:settlement:session:${session.id}`,
          description: `Settlement for session #${session.id} (${hold.commissionRateBps} bps commission)`,
          createdBy: user.id,
          entries: [
            { accountCode: '2100', direction: 'debit', amountMinor: gross },
            {
              accountCode: '2000',
              direction: 'credit',
              amountMinor: tutorNetMinor,
              tutorUserId: booking.tutorUserId,
            },
            {
              accountCode: '4000',
              direction: 'credit',
              amountMinor: platformFeeMinor,
            },
          ],
        },
        manager,
      );

      const newReleased = BigInt(hold.releasedMinor) + gross;
      hold.releasedMinor = newReleased.toString();
      const totalConsumed = newReleased + BigInt(hold.refundedMinor);
      hold.status = totalConsumed === BigInt(hold.amountMinor) ? 'released' : 'partially_released';
      if (hold.status === 'released') hold.closedAt = new Date();
      await manager.save(hold);

      const settlement = manager.create(SessionSettlementEntity, {
        sessionId: session.id,
        bookingId: booking.id,
        paymentOrderId: hold.paymentOrderId,
        escrowHoldId: hold.id,
        tutorUserId: booking.tutorUserId,
        grossAmountMinor: gross.toString(),
        platformFeeMinor: platformFeeMinor.toString(),
        tutorNetMinor: tutorNetMinor.toString(),
        commissionRateBps: hold.commissionRateBps,
        commissionPolicyId: hold.commissionPolicyId,
        currency: hold.currency,
        status: 'settled',
        journalId: journal.id,
        settledBy: user.id,
      });
      const saved = await manager.save(settlement);

      // Serialize with payout requests so a payout cannot race a release.
      await manager
        .createQueryBuilder()
        .insert()
        .into(TutorFinancialAccountEntity)
        .values({ tutorUserId: booking.tutorUserId, currency: 'BDT', reservedMinor: '0' })
        .orIgnore()
        .execute();
      await manager.findOne(TutorFinancialAccountEntity, {
        where: { tutorUserId: booking.tutorUserId },
        lock: { mode: 'pessimistic_write' },
      });

      return { journal, settlement: saved, idempotent: false };
    });

    if (!result.idempotent) {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'payment.milestone_settled',
        resourceType: 'booking_sessions',
        resourceId: dto.sessionId,
        requestId,
        safeMetadata: {
          sessionId: dto.sessionId,
          settlementId: result.settlement.id,
          grossMinor: result.settlement.grossAmountMinor.toString(),
          platformFeeMinor: result.settlement.platformFeeMinor.toString(),
          tutorNetMinor: result.settlement.tutorNetMinor.toString(),
        },
      });

      await this.notifyTutor(result.settlement);
    }

    return result.journal;
  }

  private async notifyTutor(settlement: SessionSettlementEntity): Promise<void> {
    if (!this.notificationService) return;
    await this.notificationService
      .dispatch({
        userId: settlement.tutorUserId,
        recipientRole: 'tutor',
        eventType: 'tutor.earnings_released',
        payload: {
          amount: (Number(settlement.tutorNetMinor) / 100).toFixed(2),
          sessionId: settlement.sessionId,
        },
      })
      .catch((err) => this.logger.warn(`Settlement notification failed: ${err}`));
  }

  /**
   * Cross-checks orders, verified transactions, refunds, payouts and the
   * ledger, then persists the run. A discrepancy never mutates money.
   */
  async runReconciliation(user?: AuthenticatedUser): Promise<ReconciliationReport> {
    const run = this.reconciliationRepo.create({
      status: 'running',
      runBy: user?.id ?? null,
      startedAt: new Date(),
    });
    const savedRun = await this.reconciliationRepo.save(run);

    try {
      const [orders, transactions, refunds, payouts] = await Promise.all([
        this.orderRepo.find(),
        this.transactionRepo.find(),
        this.refundRepo.find(),
        this.payoutRepo.find(),
      ]);
      const ledgerIntegrity = await this.ledgerService.verifySystemLedgerIntegrity();

      const succeededOrders = orders.filter((o) => o.status === 'succeeded');
      const discrepancies: Array<{ reference: string; reason: string }> = [];

      for (const order of succeededOrders) {
        const match = transactions.find(
          (t) => t.paymentOrderId === order.id && t.status === 'succeeded',
        );
        if (!match) {
          discrepancies.push({
            reference: order.id,
            reason: 'Succeeded payment order has no verified transaction record',
          });
        }
      }

      for (const refund of refunds) {
        if (refund.status === 'succeeded' && !refund.ledgerJournalId) {
          discrepancies.push({
            reference: refund.id,
            reason: 'Succeeded refund has no ledger journal',
          });
        }
      }

      for (const payout of payouts) {
        if (payout.status === 'paid' && !payout.externalReference) {
          discrepancies.push({
            reference: payout.id,
            reason: 'Paid payout has no external transfer reference',
          });
        }
      }

      if (!ledgerIntegrity.isBalanced) {
        discrepancies.push({
          reference: 'SYSTEM_LEDGER',
          reason: `System ledger is unbalanced by ${ledgerIntegrity.discrepancy} poisha`,
        });
      }

      savedRun.status = ledgerIntegrity.isBalanced ? 'reconciled' : 'discrepancy_detected';
      savedRun.finishedAt = new Date();
      savedRun.ordersChecked = orders.length;
      savedRun.transactionsChecked = transactions.length;
      savedRun.refundsChecked = refunds.length;
      savedRun.payoutsChecked = payouts.length;
      savedRun.discrepancyCount = discrepancies.length;
      savedRun.ledgerTotalDebitsMinor = ledgerIntegrity.totalDebits.toString();
      savedRun.ledgerTotalCreditsMinor = ledgerIntegrity.totalCredits.toString();
      savedRun.details = { discrepancies };
      await this.reconciliationRepo.save(savedRun);

      return {
        runId: savedRun.id,
        reconciledAt: new Date().toISOString(),
        totalOrders: orders.length,
        succeededOrders: succeededOrders.length,
        totalTransactions: transactions.length,
        totalRefunds: refunds.length,
        totalPayouts: payouts.length,
        isLedgerBalanced: ledgerIntegrity.isBalanced,
        ledgerTotalDebitsPoisha: ledgerIntegrity.totalDebits.toString(),
        ledgerTotalCreditsPoisha: ledgerIntegrity.totalCredits.toString(),
        unreconciledDiscrepancies: discrepancies,
      };
    } catch (error: unknown) {
      savedRun.status = 'failed';
      savedRun.finishedAt = new Date();
      savedRun.errorMessage = error instanceof Error ? error.message : 'Reconciliation failed';
      await this.reconciliationRepo.save(savedRun);
      throw error;
    }
  }
}
