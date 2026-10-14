import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import { SystemSettingEntity, FeatureFlagEntity } from '../entities';
import { UserEntity } from '../../auth/entities/user.entity';
import { AuditLogEntity } from '../../audit/entities/audit-log.entity';
import { AuditService } from '../../audit/audit.service';
import { LedgerService } from '../../payments/ledger.service';
import { redactSensitiveData } from '../utils/redact.util';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isSuperAdmin } from '../../../common/auth/role.utils';
import {
  UpdateSystemSettingDto,
  UpdateFeatureFlagDto,
  StartImpersonationDto,
  QueryAuditLogsDto,
} from '../dto';

/**
 * Platform controls: ledger reconciliation, system settings, feature flags,
 * impersonation protocol, and audit log querying with PII redaction.
 */
@Injectable()
export class AdminPlatformService {
  private readonly logger = new Logger(AdminPlatformService.name);
  private readonly jwtSecret =
    process.env.JWT_SECRET || 'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh';

  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly systemSettingRepo: Repository<SystemSettingEntity>,
    @InjectRepository(FeatureFlagEntity)
    private readonly featureFlagRepo: Repository<FeatureFlagEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * 9. Financial Reconciliation Visibility: Run full ledger audit and balance check
   */
  async getReconciliationOverview(adminUser: AuthenticatedUser) {
    const reconciliation = await this.ledgerService.runReconciliation();

    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.ledger.reconciliation_inspected',
      resourceType: 'ledger',
      safeMetadata: { isBalanced: reconciliation.isBalanced, status: reconciliation.status },
    });

    return reconciliation;
  }

  /**
   * 10. System Settings Management: Configurable platform parameters
   */
  async getSettings(): Promise<SystemSettingEntity[]> {
    return this.systemSettingRepo.find({ order: { key: 'ASC' } });
  }

  async updateSetting(
    superAdmin: AuthenticatedUser,
    key: string,
    dto: UpdateSystemSettingDto,
  ): Promise<SystemSettingEntity> {
    if (!isSuperAdmin(superAdmin)) {
      throw new ForbiddenException(
        'Updating system settings is strictly restricted to super_admin',
      );
    }

    let setting = await this.systemSettingRepo.findOne({ where: { key } });
    if (!setting) {
      setting = this.systemSettingRepo.create({
        key,
        value: dto.value,
        description: dto.description,
      });
    } else {
      setting.value = dto.value;
      if (dto.description !== undefined) {
        setting.description = dto.description;
      }
    }
    setting.updatedBy = superAdmin.id;

    const saved = await this.systemSettingRepo.save(setting);

    await this.auditService.record({
      actorUserId: superAdmin.id,
      action: 'admin.system_setting.updated',
      resourceType: 'system_settings',
      resourceId: key,
      safeMetadata: { key, value: dto.value },
    });

    return saved;
  }

  /**
   * 11. Feature Flags Management: Emergency platform controls and canary rollouts
   */
  async getFeatureFlags(): Promise<FeatureFlagEntity[]> {
    return this.featureFlagRepo.find({ order: { key: 'ASC' } });
  }

  async updateFeatureFlag(
    superAdmin: AuthenticatedUser,
    key: string,
    dto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlagEntity> {
    if (!isSuperAdmin(superAdmin)) {
      throw new ForbiddenException('Updating feature flags is strictly restricted to super_admin');
    }

    let flag = await this.featureFlagRepo.findOne({ where: { key } });
    if (!flag) {
      flag = this.featureFlagRepo.create({ key, enabled: dto.enabled, rules: dto.rules || {} });
    } else {
      flag.enabled = dto.enabled;
      if (dto.rules !== undefined) {
        flag.rules = dto.rules;
      }
    }
    flag.updatedBy = superAdmin.id;

    const saved = await this.featureFlagRepo.save(flag);

    await this.auditService.record({
      actorUserId: superAdmin.id,
      action: 'admin.feature_flag.updated',
      resourceType: 'feature_flags',
      resourceId: key,
      safeMetadata: { key, enabled: dto.enabled, rules: dto.rules },
    });

    return saved;
  }

  /**
   * 12. Impersonation Protocol (Strict Super-Admin Only, Max 15 minutes, Audited, Non-Super-Admin Target)
   */
  async startImpersonation(
    superAdmin: AuthenticatedUser,
    dto: StartImpersonationDto,
  ): Promise<{
    accessToken: string;
    targetUser: { id: string; displayName: string; email: string | null; roles: string[] };
    durationMinutes: number;
    expiresAt: Date;
    impersonatorUserId: string;
  }> {
    // Invariant 1: Caller MUST hold super_admin role
    if (!isSuperAdmin(superAdmin)) {
      throw new ForbiddenException(
        'Impersonation protocol is exclusively restricted to super_admin',
      );
    }

    // Invariant 2: Target user must exist
    const targetUser = await this.userRepo.findOne({ where: { id: dto.targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(
        `Target user ${dto.targetUserId} for impersonation does not exist`,
      );
    }

    // Invariant 3: Target user cannot be a super_admin (Prevention of privilege escalation / peer impersonation)
    const targetRolesRes: Array<{ code: string }> = await this.dataSource.query(
      `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.revoked_at IS NULL;`,
      [dto.targetUserId],
    );
    const targetRoles: string[] = targetRolesRes.map((r: { code: string }) => r.code);
    if (targetRoles.includes('super_admin')) {
      throw new ForbiddenException('Security violation: Cannot impersonate another super_admin');
    }

    // Invariant 4: Duration strictly capped at 15 minutes (900 seconds)
    const durationMinutes = Math.min(dto.durationMinutes || 15, 15);
    const durationSeconds = durationMinutes * 60;
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

    // Invariant 5: Sign token with explicit impersonation metadata
    const payload = {
      sub: targetUser.id,
      email: targetUser.email,
      phone: targetUser.phoneE164,
      roles: targetRoles.length > 0 ? targetRoles : ['student'],
      preferredLocale: targetUser.preferredLocale,
      isImpersonated: true,
      impersonatorUserId: superAdmin.id,
      impersonationReason: dto.reason,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: durationSeconds,
    });

    // Invariant 6: Mandatory High-Priority Audit Log
    await this.auditService.record({
      actorUserId: superAdmin.id,
      action: 'admin.impersonation_started',
      resourceType: 'users',
      resourceId: dto.targetUserId,
      reason: dto.reason,
      safeMetadata: {
        impersonatorUserId: superAdmin.id,
        targetUserId: dto.targetUserId,
        durationMinutes,
        expiresAt: expiresAt.toISOString(),
      },
    });

    this.logger.warn(
      `SECURITY AUDIT: Super-admin ${superAdmin.id} started impersonation of user ${dto.targetUserId} for ${durationMinutes}m. Reason: ${dto.reason}`,
    );

    return {
      accessToken,
      targetUser: {
        id: targetUser.id,
        displayName: targetUser.displayName,
        email: targetUser.email,
        roles: targetRoles,
      },
      durationMinutes,
      expiresAt,
      impersonatorUserId: superAdmin.id,
    };
  }

  /**
   * 13. Audit Log Querying with Automated PII and Credential Redaction
   */
  async queryAuditLogs(
    adminUser: AuthenticatedUser,
    dto: QueryAuditLogsDto,
  ): Promise<{ logs: AuditLogEntity[]; total: number }> {
    const limit = Math.min(dto.limit || 50, 200);
    const offset = dto.offset || 0;

    const qb = this.auditRepo
      .createQueryBuilder('audit')
      .orderBy('audit.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (dto.actorUserId) {
      qb.andWhere('audit.actorUserId = :actorUserId', { actorUserId: dto.actorUserId });
    }
    if (dto.action) {
      qb.andWhere('audit.action ILIKE :action', { action: `%${dto.action}%` });
    }
    if (dto.resourceType) {
      qb.andWhere('audit.resourceType = :resourceType', { resourceType: dto.resourceType });
    }
    if (dto.resourceId) {
      qb.andWhere('audit.resourceId = :resourceId', { resourceId: dto.resourceId });
    }

    const [logs, total] = await qb.getManyAndCount();

    // Automated Secret / PII Redaction
    const sanitizedLogs = logs.map(redactSensitiveData);

    return { logs: sanitizedLogs, total };
  }
}
