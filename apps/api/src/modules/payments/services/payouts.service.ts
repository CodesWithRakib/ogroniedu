import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import {
  PayoutEntity,
  TutorFinancialAccountEntity,
  SessionSettlementEntity,
  TutorEarningAdjustmentEntity,
  EscrowHoldEntity,
} from '../entities';
import { LedgerService } from '../ledger.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { CommissionPolicyService } from './commission-policy.service';
import {
  MarkPayoutFailedDto,
  MarkPayoutPaidDto,
  RejectPayoutDto,
  RequestPayoutDto,
} from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import {
  hashAccountReference,
  maskAccountReference,
  parseMinor,
} from '../../../common/money/money';

const ACTIVE_PAYOUT_STATUSES = ['requested', 'approved', 'processing'] as const;

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectRepository(PayoutEntity)
    private readonly payoutRepo: Repository<PayoutEntity>,
    @InjectRepository(TutorFinancialAccountEntity)
    private readonly accountRepo: Repository<TutorFinancialAccountEntity>,
    @InjectRepository(SessionSettlementEntity)
    private readonly settlementRepo: Repository<SessionSettlementEntity>,
    @InjectRepository(TutorEarningAdjustmentEntity)
    private readonly adjustmentRepo: Repository<TutorEarningAdjustmentEntity>,
    @InjectRepository(EscrowHoldEntity)
    private readonly escrowRepo: Repository<EscrowHoldEntity>,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
    @Inject(CommissionPolicyService)
    private readonly commissionPolicyService: CommissionPolicyService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService?: NotificationService,
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  private get db(): DataSource {
    if (!this.dataSource) {
      throw new Error('DataSource is required for payout operations');
    }
    return this.dataSource;
  }

  /** Ensure the serialization row exists, then lock it for the transaction. */
  private async lockAccount(
    manager: EntityManager,
    tutorUserId: string,
  ): Promise<TutorFinancialAccountEntity> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(TutorFinancialAccountEntity)
      .values({ tutorUserId, currency: 'BDT', reservedMinor: '0' })
      .orIgnore()
      .execute();

    const account = await manager.findOne(TutorFinancialAccountEntity, {
      where: { tutorUserId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!account) {
      throw new NotFoundException('Tutor financial account could not be initialized');
    }
    return account;
  }

  private async activePayoutSum(manager: EntityManager, tutorUserId: string): Promise<bigint> {
    const row = await manager
      .createQueryBuilder(PayoutEntity, 'payout')
      .select('COALESCE(SUM(payout.amount_minor), 0)', 'total')
      .where('payout.tutor_user_id = :tutorUserId', { tutorUserId })
      .andWhere('payout.status IN (:...statuses)', { statuses: [...ACTIVE_PAYOUT_STATUSES] })
      .getRawOne<{ total: string }>();
    return BigInt(row?.total ?? '0');
  }

  /** Tutor payable derived from ledger entries (account 2000, party-filtered). */
  private async ledgerPayable(manager: EntityManager, tutorUserId: string): Promise<bigint> {
    const row = await manager
      .createQueryBuilder()
      .select(
        "COALESCE(SUM(CASE WHEN e.direction = 'credit' THEN e.amount_minor ELSE -e.amount_minor END), 0)",
        'balance',
      )
      .from('ledger_entries', 'e')
      .innerJoin('ledger_accounts', 'a', 'a.id = e.account_id')
      .where('a.code = :code', { code: '2000' })
      .andWhere('e.tutor_user_id = :tutorUserId', { tutorUserId })
      .getRawOne<{ balance: string }>();
    return BigInt(row?.balance ?? '0');
  }

  private async nextPayoutNumber(manager: EntityManager): Promise<string> {
    const rows = await manager.query<Array<{ nextval: string }>>(
      "SELECT nextval('payout_number_seq')::text AS nextval",
    );
    const sequence = rows[0]?.nextval ?? '1';
    return `PAY-${new Date().getUTCFullYear()}-${sequence.padStart(6, '0')}`;
  }

  async requestPayout(user: AuthenticatedUser, dto: RequestPayoutDto): Promise<PayoutEntity> {
    const amount = parseMinor(dto.amountMinor);
    const policy = await this.commissionPolicyService.getActivePolicy();
    const minimum = parseMinor(policy.minPayoutMinor);
    if (amount < minimum) {
      throw new BadRequestException(
        `Minimum payout is ${minimum.toString()} poisha (BDT ${(Number(minimum) / 100).toFixed(2)})`,
      );
    }

    const payout = await this.db.transaction(async (manager) => {
      const existing = await manager.findOne(PayoutEntity, {
        where: { tutorUserId: user.id, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;

      const account = await this.lockAccount(manager, user.id);
      const payable = await this.ledgerPayable(manager, user.id);
      const reserved = await this.activePayoutSum(manager, user.id);
      const available = payable - reserved;

      if (available <= 0n || amount > available) {
        throw new BadRequestException(
          `Payout amount exceeds available balance (${available > 0n ? available.toString() : '0'} poisha)`,
        );
      }

      const created = manager.create(PayoutEntity, {
        payoutNumber: await this.nextPayoutNumber(manager),
        tutorUserId: user.id,
        amountMinor: amount.toString(),
        currency: 'BDT',
        status: 'requested',
        method: dto.method,
        accountReferenceMasked: maskAccountReference(dto.accountReference),
        accountReferenceHash: hashAccountReference(dto.accountReference),
        requestedBy: user.id,
        idempotencyKey: dto.idempotencyKey,
      });
      const saved = await manager.save(created);

      account.reservedMinor = (reserved + amount).toString();
      await manager.save(account);

      this.logger.log(`Payout ${saved.payoutNumber} requested for ${amount} poisha`);
      return saved;
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'finance.payout_requested',
      resourceType: 'payouts',
      resourceId: payout.id,
      safeMetadata: {
        payoutNumber: payout.payoutNumber,
        amountMinor: payout.amountMinor.toString(),
        method: payout.method,
      },
    });

    await this.notify(user.id, 'payout.requested', {
      payoutId: payout.id,
      amount: (Number(payout.amountMinor) / 100).toFixed(2),
    });

    return payout;
  }

  async listMine(user: AuthenticatedUser): Promise<PayoutEntity[]> {
    return this.payoutRepo.find({
      where: { tutorUserId: user.id },
      order: { createdAt: 'DESC' },
    });
  }

  async getPayoutForTutor(user: AuthenticatedUser, payoutId: string): Promise<PayoutEntity> {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    this.assertTutorOwnsPayout(user, payout);
    return payout;
  }

  async listForFinance(status?: string): Promise<PayoutEntity[]> {
    const where = status ? { status: status as PayoutEntity['status'] } : {};
    return this.payoutRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  private async getPayout(id: string): Promise<PayoutEntity> {
    const payout = await this.payoutRepo.findOne({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    return payout;
  }

  async approve(user: AuthenticatedUser, payoutId: string): Promise<PayoutEntity> {
    const payout = await this.db.transaction(async (manager) => {
      const locked = await manager.findOne(PayoutEntity, {
        where: { id: payoutId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Payout not found');
      if (locked.status !== 'requested') {
        throw new BadRequestException(`Payout in status '${locked.status}' cannot be approved`);
      }
      locked.status = 'approved';
      locked.reviewedBy = user.id;
      locked.reviewedAt = new Date();
      return manager.save(locked);
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'finance.payout_approved',
      resourceType: 'payouts',
      resourceId: payoutId,
      safeMetadata: { amountMinor: payout.amountMinor.toString() },
    });
    await this.notify(payout.tutorUserId, 'payout.approved', {
      payoutId: payout.id,
      amount: (Number(payout.amountMinor) / 100).toFixed(2),
    });
    return payout;
  }

  private async releaseAndClose(
    manager: EntityManager,
    payout: PayoutEntity,
    status: 'rejected' | 'failed',
    reason: string,
    actorUserId: string,
  ): Promise<PayoutEntity> {
    const account = await this.lockAccount(manager, payout.tutorUserId);
    payout.status = status;
    payout.failureReason = reason;
    payout.reviewedBy = actorUserId;
    payout.reviewedAt = new Date();
    const saved = await manager.save(payout);
    const active = await this.activePayoutSum(manager, payout.tutorUserId);
    account.reservedMinor = active.toString();
    await manager.save(account);
    return saved;
  }

  async reject(
    user: AuthenticatedUser,
    payoutId: string,
    dto: RejectPayoutDto,
  ): Promise<PayoutEntity> {
    const payout = await this.db.transaction(async (manager) => {
      const locked = await manager.findOne(PayoutEntity, {
        where: { id: payoutId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Payout not found');
      if (locked.status !== 'requested' && locked.status !== 'approved') {
        throw new BadRequestException(`Payout in status '${locked.status}' cannot be rejected`);
      }
      return this.releaseAndClose(manager, locked, 'rejected', dto.reason, user.id);
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'finance.payout_rejected',
      resourceType: 'payouts',
      resourceId: payoutId,
      safeMetadata: { reason: dto.reason },
    });
    await this.notify(payout.tutorUserId, 'payout.rejected', {
      payoutId: payout.id,
      reason: dto.reason,
    });
    return payout;
  }

  async markPaid(
    user: AuthenticatedUser,
    payoutId: string,
    dto: MarkPayoutPaidDto,
  ): Promise<PayoutEntity> {
    // Fail fast on a missing transfer reference before touching the ledger.
    if (!dto.externalReference?.trim()) {
      throw new BadRequestException('An external transfer reference is required');
    }

    const payout = await this.db.transaction(async (manager) => {
      const locked = await manager.findOne(PayoutEntity, {
        where: { id: payoutId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Payout not found');
      if (locked.status === 'paid') return locked;
      if (locked.status !== 'approved' && locked.status !== 'processing') {
        throw new BadRequestException(`Payout in status '${locked.status}' cannot be marked paid`);
      }
      if (!dto.externalReference.trim()) {
        throw new BadRequestException('An external transfer reference is required');
      }

      const account = await this.lockAccount(manager, locked.tutorUserId);
      const payable = await this.ledgerPayable(manager, locked.tutorUserId);
      const amount = BigInt(locked.amountMinor);
      if (payable < amount) {
        throw new BadRequestException(
          `Tutor payable balance (${payable.toString()}) is less than the payout amount`,
        );
      }

      await this.ledgerService.postJournal(
        {
          sourceType: 'payout',
          sourceId: locked.id,
          idempotencyKey: `ledger:payout:${locked.id}`,
          description: `Tutor payout ${locked.payoutNumber} disbursed via ${locked.method}`,
          createdBy: user.id,
          entries: [
            {
              accountCode: '2000',
              direction: 'debit',
              amountMinor: amount,
              tutorUserId: locked.tutorUserId,
            },
            { accountCode: '1100', direction: 'credit', amountMinor: amount },
          ],
        },
        manager,
      );

      locked.status = 'paid';
      locked.paidAt = new Date();
      locked.paidBy = user.id;
      locked.externalReference = dto.externalReference.trim();
      if (dto.note) locked.decisionNote = dto.note;
      const saved = await manager.save(locked);

      const active = await this.activePayoutSum(manager, locked.tutorUserId);
      account.reservedMinor = active.toString();
      await manager.save(account);

      return saved;
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'finance.payout_paid',
      resourceType: 'payouts',
      resourceId: payoutId,
      safeMetadata: {
        payoutNumber: payout.payoutNumber,
        amountMinor: payout.amountMinor.toString(),
        externalReference: dto.externalReference,
      },
    });
    await this.notify(payout.tutorUserId, 'payout.paid', {
      payoutId: payout.id,
      amount: (Number(payout.amountMinor) / 100).toFixed(2),
    });
    return payout;
  }

  async markFailed(
    user: AuthenticatedUser,
    payoutId: string,
    dto: MarkPayoutFailedDto,
  ): Promise<PayoutEntity> {
    const payout = await this.db.transaction(async (manager) => {
      const locked = await manager.findOne(PayoutEntity, {
        where: { id: payoutId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Payout not found');
      if (locked.status !== 'approved' && locked.status !== 'processing') {
        throw new BadRequestException(`Payout in status '${locked.status}' cannot be marked failed`);
      }
      return this.releaseAndClose(manager, locked, 'failed', dto.reason, user.id);
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'finance.payout_failed',
      resourceType: 'payouts',
      resourceId: payoutId,
      safeMetadata: { reason: dto.reason },
    });
    return payout;
  }

  /** Tutor dashboard: all figures are derived, never stored guesses. */
  async getTutorSummary(user: AuthenticatedUser): Promise<{
    lifetimeNetMinor: string;
    availableMinor: string;
    reservedMinor: string;
    paidOutMinor: string;
    escrowPendingMinor: string;
    minimumPayoutMinor: string;
    payouts: PayoutEntity[];
    settlements: SessionSettlementEntity[];
    adjustments: TutorEarningAdjustmentEntity[];
  }> {
    const policy = await this.commissionPolicyService.getActivePolicy();

    const settlements = await this.settlementRepo.find({
      where: { tutorUserId: user.id, status: 'settled' },
      order: { settledAt: 'DESC' },
      take: 100,
    });
    const adjustments = await this.adjustmentRepo.find({
      where: { tutorUserId: user.id },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const payouts = await this.payoutRepo.find({
      where: { tutorUserId: user.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const holds = await this.escrowRepo.find({
      where: {
        tutorUserId: user.id,
        status: In(['held', 'partially_released']),
      },
    });

    const settlementsNet = settlements.reduce(
      (sum, s) => sum + BigInt(s.tutorNetMinor),
      0n,
    );
    const adjustmentNet = adjustments.reduce((sum, a) => {
      const amount = BigInt(a.amountMinor);
      return a.direction === 'credit' ? sum + amount : sum - amount;
    }, 0n);
    const lifetimeNet = settlementsNet + adjustmentNet;

    const payoutsPaid = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + BigInt(p.amountMinor), 0n);
    const reserved = payouts
      .filter((p) => (ACTIVE_PAYOUT_STATUSES as readonly string[]).includes(p.status))
      .reduce((sum, p) => sum + BigInt(p.amountMinor), 0n);

    const payable = await this.ledgerService.getPartyBalance('2000', user.id);
    const available = payable > reserved ? payable - reserved : 0n;

    const escrowPending = holds.reduce((sum, h) => {
      const remaining = BigInt(h.amountMinor) - BigInt(h.releasedMinor) - BigInt(h.refundedMinor);
      return remaining > 0n ? sum + remaining : sum;
    }, 0n);

    return {
      lifetimeNetMinor: lifetimeNet.toString(),
      availableMinor: available.toString(),
      reservedMinor: reserved.toString(),
      paidOutMinor: payoutsPaid.toString(),
      escrowPendingMinor: escrowPending.toString(),
      minimumPayoutMinor: policy.minPayoutMinor.toString(),
      payouts,
      settlements,
      adjustments,
    };
  }

  private async notify(
    userId: string,
    eventType:
      | 'payout.requested'
      | 'payout.approved'
      | 'payout.rejected'
      | 'payout.paid',
    payload: Record<string, string | number>,
  ): Promise<void> {
    if (!this.notificationService) return;
    await this.notificationService
      .dispatch({ userId, recipientRole: 'tutor', eventType, payload })
      .catch((err) => this.logger.warn(`Payout notification failed: ${err}`));
  }

  /** Guard used by the controller for record-level access (defence in depth). */
  assertTutorOwnsPayout(user: AuthenticatedUser, payout: PayoutEntity): void {
    if (payout.tutorUserId !== user.id) {
      throw new ForbiddenException('Access denied to this payout');
    }
  }
}
