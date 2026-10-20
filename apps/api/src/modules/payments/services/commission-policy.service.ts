import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CommissionPolicyEntity } from '../entities';
import { UpdateCommissionPolicyDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuditService } from '../../audit/audit.service';
import { Inject, forwardRef } from '@nestjs/common';

@Injectable()
export class CommissionPolicyService {
  private readonly logger = new Logger(CommissionPolicyService.name);

  constructor(
    @InjectRepository(CommissionPolicyEntity)
    private readonly policyRepo: Repository<CommissionPolicyEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /** Active default policy. Seeded by migration 022. */
  async getActivePolicy(): Promise<CommissionPolicyEntity> {
    const policy = await this.policyRepo.findOne({
      where: { code: 'default', isActive: true },
      order: { version: 'DESC' },
    });
    if (!policy) {
      throw new NotFoundException(
        'No active commission policy is configured. Apply migration 022 or contact operations.',
      );
    }
    return policy;
  }

  async listVersions(): Promise<CommissionPolicyEntity[]> {
    return this.policyRepo.find({
      where: { code: 'default' },
      order: { version: 'DESC' },
    });
  }

  /**
   * Create a new active version. The previous version is deactivated in the
   * same transaction; existing orders keep their snapshot.
   */
  async createVersion(
    user: AuthenticatedUser,
    dto: UpdateCommissionPolicyDto,
  ): Promise<CommissionPolicyEntity> {
    if (dto.platformFeeBps > 3000) {
      throw new BadRequestException('Platform fee cannot exceed 30%');
    }

    const created = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(CommissionPolicyEntity, {
        where: { code: 'default', isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      const nextVersion = current ? current.version + 1 : 1;

      if (current) {
        current.isActive = false;
        current.effectiveTo = new Date();
        await manager.save(current);
      }

      const policy = manager.create(CommissionPolicyEntity, {
        code: 'default',
        version: nextVersion,
        platformFeeBps: dto.platformFeeBps,
        minPayoutMinor: dto.minPayoutMinor.toString(),
        currency: 'BDT',
        isActive: true,
        effectiveFrom: new Date(),
        effectiveTo: null,
        notes: dto.notes ?? null,
        createdBy: user.id,
      });
      return manager.save(policy);
    });

    await this.auditService.record({
      actorUserId: user.id,
      action: 'finance.commission_policy_created',
      resourceType: 'commission_policies',
      resourceId: created.id,
      safeMetadata: {
        version: created.version,
        platformFeeBps: created.platformFeeBps,
        minPayoutMinor: created.minPayoutMinor,
      },
    });

    this.logger.log(
      `Commission policy version ${created.version} activated at ${created.platformFeeBps} bps`,
    );
    return created;
  }
}
