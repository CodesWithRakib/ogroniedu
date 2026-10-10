import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import jwt from 'jsonwebtoken';

import { SystemSettingEntity, FeatureFlagEntity } from './entities';
import { UserEntity } from '../auth/entities/user.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { TutorReplacementCaseEntity } from '../trust/entities/tutor-replacement-case.entity';
import { SafetyReportEntity } from '../trust/entities/safety-report.entity';
import { PaymentOrderEntity } from '../payments/entities/payment-order.entity';
import { AuditService } from '../audit/audit.service';
import { LedgerService } from '../payments/ledger.service';
import { PaymentsService } from '../payments/payments.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

import {
  SuspendUserDto,
  UpdateUserRolesDto,
  UpdateSystemSettingDto,
  UpdateFeatureFlagDto,
  StartImpersonationDto,
  QueryAuditLogsDto,
  AdminCancelBookingDto,
  AssignSupportCaseDto,
} from './dto';

export function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }
  const redacted: Record<string, any> = {};
  const sensitiveKeyRegex =
    /(password|token|secret|cvv|pan|card|pin|hash|credential|api_?key|^key$)/i;

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeyRegex.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

@Injectable()
export class AdminOperationsService {
  private readonly logger = new Logger(AdminOperationsService.name);
  private readonly jwtSecret =
    process.env.JWT_SECRET || 'ogroniedu-super-secure-jwt-secret-key-2026-bangladesh';

  constructor(
    @InjectRepository(SystemSettingEntity)
    private readonly systemSettingRepo: Repository<SystemSettingEntity>,
    @InjectRepository(FeatureFlagEntity)
    private readonly featureFlagRepo: Repository<FeatureFlagEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @InjectRepository(TutorReplacementCaseEntity)
    private readonly replacementCaseRepo: Repository<TutorReplacementCaseEntity>,
    @InjectRepository(SafetyReportEntity)
    private readonly safetyReportRepo: Repository<SafetyReportEntity>,
    @InjectRepository(PaymentOrderEntity)
    private readonly paymentOrderRepo: Repository<PaymentOrderEntity>,
    private readonly auditService: AuditService,
    private readonly ledgerService: LedgerService,
    private readonly paymentsService: PaymentsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. Operational Dashboard Overview: Metrics across verification queues, disputes, safety, and ledger
   */
  async getOperationalDashboard(): Promise<{
    pendingTutorVerifications: number;
    activeReplacementCases: number;
    openSafetyReports: number;
    activeBookingsCount: number;
    totalRegisteredUsers: number;
    ledgerIntegrity: {
      isBalanced: boolean;
      totalDebits: string;
      totalCredits: string;
      discrepancy: string;
    };
  }> {
    const pendingTutorsRes = await this.dataSource.query(
      `SELECT count(*)::int as count FROM tutor_profiles WHERE publication_status = 'pending_review';`,
    );
    const pendingTutors = pendingTutorsRes[0]?.count || 0;

    const activeReplacement = await this.replacementCaseRepo.count({
      where: { status: In(['requested', 'under_review', 'matching']) },
    });

    const openSafety = await this.safetyReportRepo.count({
      where: { status: In(['submitted', 'under_investigation', 'escalated']) },
    });

    const activeBookings = await this.bookingRepo.count({
      where: { status: 'confirmed' },
    });

    const totalUsers = await this.userRepo.count();

    const ledger = await this.ledgerService.verifySystemLedgerIntegrity();

    return {
      pendingTutorVerifications: pendingTutors,
      activeReplacementCases: activeReplacement,
      openSafetyReports: openSafety,
      activeBookingsCount: activeBookings,
      totalRegisteredUsers: totalUsers,
      ledgerIntegrity: {
        isBalanced: ledger.isBalanced,
        totalDebits: ledger.totalDebits.toString(),
        totalCredits: ledger.totalCredits.toString(),
        discrepancy: ledger.discrepancy.toString(),
      },
    };
  }

  /**
   * 2. User Management: Search, list, and filter users
   */
  async listUsers(query: {
    search?: string;
    role?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: any[]; total: number }> {
    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    let sql = `
      SELECT u.id, u.display_name, u.email, u.phone_e164, u.status, u.preferred_locale,
             u.created_at, u.last_login_at,
             COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}') as roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (query.search) {
      sql += ` AND (u.display_name ILIKE $${pIdx} OR u.email ILIKE $${pIdx} OR u.phone_e164 ILIKE $${pIdx})`;
      params.push(`%${query.search.trim()}%`);
      pIdx++;
    }

    if (query.status) {
      sql += ` AND u.status = $${pIdx}`;
      params.push(query.status);
      pIdx++;
    }

    sql += ` GROUP BY u.id`;

    if (query.role) {
      sql += ` HAVING $${pIdx} = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}'))`;
      params.push(query.role);
      pIdx++;
    }

    sql += ` ORDER BY u.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1};`;
    params.push(limit, offset);

    const rows = await this.dataSource.query(sql, params);

    const countRes = await this.dataSource.query(
      `SELECT count(*)::int as total FROM users WHERE deleted_at IS NULL;`,
    );
    const total = countRes[0]?.total || 0;

    return { users: rows, total };
  }

  /**
   * 3. User Dossier: Full administrative view of a user
   */
  async getUserDossier(userId: string): Promise<any> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const rolesRes = await this.dataSource.query(
      `SELECT r.code, r.name_en, r.name_bn, ur.granted_at, ur.revoked_at
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1;`,
      [userId],
    );

    const bookingsCountRes = await this.dataSource.query(
      `SELECT count(*)::int as count FROM bookings WHERE student_user_id = $1 OR tutor_user_id = $1 OR requester_user_id = $1;`,
      [userId],
    );

    const auditHistory = await this.auditService.getUserAuditHistory(userId, 10);

    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      phoneE164: user.phoneE164,
      status: user.status,
      preferredLocale: user.preferredLocale,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      roles: rolesRes,
      totalBookings: bookingsCountRes[0]?.count || 0,
      recentAuditLogs: auditHistory.map(redactSensitiveData),
    };
  }

  /**
   * 4. Suspend User: Prohibit platform interactions with explicit audited justification
   */
  async suspendUser(
    adminUser: AuthenticatedUser,
    targetUserId: string,
    dto: SuspendUserDto,
  ): Promise<UserEntity> {
    if (adminUser.id === targetUserId) {
      throw new BadRequestException('Administrators cannot suspend their own account');
    }

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    // Role check: Only super_admin can suspend another super_admin
    const targetRolesRes = await this.dataSource.query(
      `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.revoked_at IS NULL;`,
      [targetUserId],
    );
    const targetRoles: string[] = targetRolesRes.map((r: { code: string }) => r.code);
    if (targetRoles.includes('super_admin') && !adminUser.roles.includes('super_admin')) {
      throw new ForbiddenException('Only a super_admin can suspend another super_admin');
    }

    targetUser.status = 'suspended';
    const saved = await this.userRepo.save(targetUser);

    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.user.suspended',
      resourceType: 'users',
      resourceId: targetUserId,
      reason: dto.reason,
      safeMetadata: { previousStatus: targetUser.status },
    });

    this.logger.log(`User ${targetUserId} suspended by admin ${adminUser.id}: ${dto.reason}`);
    return saved;
  }

  /**
   * 5. Reactivate User
   */
  async reactivateUser(adminUser: AuthenticatedUser, targetUserId: string): Promise<UserEntity> {
    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    targetUser.status = 'active';
    const saved = await this.userRepo.save(targetUser);

    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.user.reactivated',
      resourceType: 'users',
      resourceId: targetUserId,
      reason: 'Administrative account reactivation',
    });

    this.logger.log(`User ${targetUserId} reactivated by admin ${adminUser.id}`);
    return saved;
  }

  /**
   * 6. Update User Roles: Exclusively restricted to super_admin (Least Privilege)
   */
  async updateUserRoles(
    superAdmin: AuthenticatedUser,
    targetUserId: string,
    dto: UpdateUserRolesDto,
  ): Promise<{ userId: string; assignedRoles: string[] }> {
    if (!superAdmin.roles.includes('super_admin')) {
      throw new ForbiddenException('Role management is strictly restricted to super_admin');
    }

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    // Protect last super_admin: If demoting a super_admin, verify at least one other active super_admin exists
    if (!dto.roles.includes('super_admin')) {
      const superAdminCountRes = await this.dataSource.query(
        `SELECT count(DISTINCT ur.user_id)::int as count
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE r.code = 'super_admin' AND ur.revoked_at IS NULL;`,
      );
      const totalSuperAdmins = superAdminCountRes[0]?.count || 0;
      if (totalSuperAdmins <= 1 && superAdmin.id === targetUserId) {
        throw new BadRequestException(
          'Cannot revoke super_admin from the sole remaining super_admin in system',
        );
      }
    }

    // Resolve role IDs from catalog
    const roleRows = await this.dataSource.query(
      `SELECT id, code FROM roles WHERE code = ANY($1);`,
      [dto.roles],
    );

    const roleMap = new Map<string, string>(
      roleRows.map((r: { id: string; code: string }) => [r.code, r.id]),
    );
    for (const rCode of dto.roles) {
      if (!roleMap.has(rCode)) {
        throw new BadRequestException(`Role code '${rCode}' does not exist in roles catalog`);
      }
    }

    // Revoke previous active roles and grant new roles
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE user_roles SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL;`,
        [targetUserId],
      );

      for (const rCode of dto.roles) {
        const roleId = roleMap.get(rCode)!;
        await manager.query(
          `INSERT INTO user_roles (user_id, role_id, granted_by, granted_at)
           VALUES ($1, $2, $3, now());`,
          [targetUserId, roleId, superAdmin.id],
        );
      }
    });

    await this.auditService.record({
      actorUserId: superAdmin.id,
      action: 'admin.user_roles.updated',
      resourceType: 'users',
      resourceId: targetUserId,
      reason: 'Role assignment update by super_admin',
      safeMetadata: { newRoles: dto.roles },
    });

    this.logger.log(
      `User ${targetUserId} roles updated by super_admin ${superAdmin.id}: [${dto.roles.join(', ')}]`,
    );
    return { userId: targetUserId, assignedRoles: dto.roles };
  }

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
      .leftJoinAndSelect('booking.student', 'student')
      .leftJoinAndSelect('booking.tutor', 'tutor')
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
        } catch (err: any) {
          this.logger.error(
            `Administrative refund failed for booking ${bookingId}: ${err.message}`,
          );
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
    if (!superAdmin.roles.includes('super_admin')) {
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
    if (!superAdmin.roles.includes('super_admin')) {
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
    if (!superAdmin.roles.includes('super_admin')) {
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
    const targetRolesRes = await this.dataSource.query(
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
  ): Promise<{ logs: any[]; total: number }> {
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
