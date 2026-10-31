import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { redactSensitiveData } from '../utils/redact.util';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isSuperAdmin } from '../../../common/auth/role.utils';
import { SuspendUserDto, UpdateUserRolesDto, CreateStaffDto, UpdateStaffDto } from '../dto';

/**
 * User management: search/list, dossier, suspend/reactivate, role assignment.
 */
@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  /**
   * 2. User Management: Search, list, and filter users
   */
  async listUsers(query: {
    search?: string;
    role?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: Array<Record<string, unknown>>; total: number }> {
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
    const params: Array<string | number> = [];
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

    sql += ` GROUP BY u.id
             HAVING NOT ('super_admin' = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}')))`;

    if (query.role) {
      sql += ` AND $${pIdx} = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}'))`;
      params.push(query.role);
      pIdx++;
    }

    sql += ` ORDER BY u.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1};`;
    params.push(limit, offset);

    const rows: Array<Record<string, unknown>> = await this.dataSource.query(sql, params);

    const countRes: Array<{ total: number }> = await this.dataSource.query(
      `SELECT count(DISTINCT u.id)::int as total
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.deleted_at IS NULL
         AND u.id NOT IN (
           SELECT ur2.user_id FROM user_roles ur2
           JOIN roles r2 ON ur2.role_id = r2.id
           WHERE r2.code = 'super_admin' AND ur2.revoked_at IS NULL
         );`,
    );
    const total = countRes[0]?.total || 0;

    return { users: rows, total };
  }

  /**
   * 3. User Dossier: Full administrative view of a user
   */
  async getUserDossier(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const rolesRes: Array<Record<string, unknown>> = await this.dataSource.query(
      `SELECT r.code, r.name_en, r.name_bn, ur.granted_at, ur.revoked_at
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1;`,
      [userId],
    );

    const bookingsCountRes: Array<{ count: number }> = await this.dataSource.query(
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
    const targetRolesRes: Array<{ code: string }> = await this.dataSource.query(
      `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.revoked_at IS NULL;`,
      [targetUserId],
    );
    const targetRoles: string[] = targetRolesRes.map((r: { code: string }) => r.code);
    if (targetRoles.includes('super_admin') && !isSuperAdmin(adminUser)) {
      throw new ForbiddenException('Only a super_admin can suspend another super_admin');
    }

    targetUser.status = 'suspended';
    targetUser.authEpoch = (targetUser.authEpoch || 0) + 1;
    const saved = await this.userRepo.save(targetUser);

    await this.dataSource.query(
      `INSERT INTO safety_actions (id, target_user_id, action_type, reason, applied_by, created_at)
       VALUES (gen_random_uuid(), $1, 'temporary_suspension', $2, $3, NOW())`,
      [targetUserId, dto.reason, adminUser.id],
    );

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
   * 4b. Ban User Permanently and Blacklist Identity
   */
  async banUser(
    adminUser: AuthenticatedUser,
    targetUserId: string,
    dto: { reason: string },
  ): Promise<UserEntity> {
    if (adminUser.id === targetUserId) {
      throw new BadRequestException('Administrators cannot ban their own account');
    }

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    targetUser.status = 'banned';
    targetUser.authEpoch = (targetUser.authEpoch || 0) + 1;
    const saved = await this.userRepo.save(targetUser);

    await this.dataSource.query(
      `INSERT INTO safety_actions (id, target_user_id, action_type, reason, applied_by, created_at)
       VALUES (gen_random_uuid(), $1, 'permanent_ban', $2, $3, NOW())`,
      [targetUserId, dto.reason, adminUser.id],
    );

    // Insert into banned_identities
    await this.dataSource.query(
      `INSERT INTO banned_identities (id, banned_user_id, phone_e164, email, reason, severity, banned_by, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'permanent', $5, NOW(), NOW())`,
      [targetUserId, targetUser.phoneE164, targetUser.email, dto.reason, adminUser.id],
    );

    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.user.banned',
      resourceType: 'users',
      resourceId: targetUserId,
      reason: dto.reason,
      safeMetadata: { previousStatus: targetUser.status },
    });

    this.logger.warn(
      `User ${targetUserId} permanently banned by admin ${adminUser.id}: ${dto.reason}`,
    );
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

    // Revoke any active safety actions
    await this.dataSource.query(
      `UPDATE safety_actions SET revoked_at = NOW(), revoked_by = $1, revocation_reason = 'Admin pardon'
       WHERE target_user_id = $2 AND revoked_at IS NULL`,
      [adminUser.id, targetUserId],
    );

    // Remove from banned_identities
    await this.dataSource.query(`DELETE FROM banned_identities WHERE banned_user_id = $1`, [
      targetUserId,
    ]);

    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.user.reactivated',
      resourceType: 'users',
      resourceId: targetUserId,
      reason: 'Administrative account reactivation and strike pardon',
    });

    this.logger.log(`User ${targetUserId} reactivated by admin ${adminUser.id}`);
    return saved;
  }

  /**
   * 5b. Get User Safety Strikes & Blacklist Dossier
   */
  async getUserSafetyStrikes(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const actions: Array<Record<string, unknown>> = await this.dataSource.query(
      `SELECT id, action_type, reason, applied_by, expires_at, revoked_at, created_at
       FROM safety_actions
       WHERE target_user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    const isBlacklisted: Array<{ count: number }> = await this.dataSource.query(
      `SELECT count(*)::int as count FROM banned_identities WHERE banned_user_id = $1`,
      [userId],
    );

    return {
      userId,
      displayName: user.displayName,
      email: user.email,
      phone: user.phoneE164,
      status: user.status,
      strikeCount: actions.filter((a) => !a.revoked_at).length,
      actions,
      isBlacklisted: (isBlacklisted[0]?.count || 0) > 0,
    };
  }

  /**
   * 6. Update User Roles: Exclusively restricted to super_admin (Least Privilege)
   */
  async updateUserRoles(
    superAdmin: AuthenticatedUser,
    targetUserId: string,
    dto: UpdateUserRolesDto,
  ): Promise<{ userId: string; assignedRoles: string[] }> {
    if (!isSuperAdmin(superAdmin)) {
      throw new ForbiddenException('Role management is strictly restricted to super_admin');
    }

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    // Protect last super_admin: If demoting a super_admin, verify at least one other active super_admin exists
    if (!dto.roles.includes('super_admin')) {
      const superAdminCountRes: Array<{ count: number }> = await this.dataSource.query(
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
    const roleRows: Array<{ id: string; code: string }> =
      (await this.dataSource.query(`SELECT id, code FROM roles WHERE code = ANY($1);`, [
        dto.roles,
      ])) || [];

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
   * 7. Staff Management: List only administrative and staff accounts, EXCLUDING super_admin!
   * Owner/super_admin is strictly hidden from this list so nobody can see the platform owner.
   */
  async listStaff(query?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ staff: Array<Record<string, unknown>>; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 10));
    const offset = (page - 1) * limit;

    let baseFilter = `
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
      JOIN roles r ON ur.role_id = r.id
      WHERE u.deleted_at IS NULL
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (query?.search) {
      baseFilter += ` AND (u.display_name ILIKE $${pIdx} OR u.email ILIKE $${pIdx} OR u.phone_e164 ILIKE $${pIdx})`;
      params.push(`%${query.search.trim()}%`);
      pIdx++;
    }

    if (query?.status) {
      baseFilter += ` AND u.status = $${pIdx}`;
      params.push(query.status);
      pIdx++;
    }

    let havingClause = `
      HAVING NOT ('super_admin' = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}')))
         AND (
           'admin' = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}'))
           OR 'support_agent' = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}'))
           OR 'compliance_reviewer' = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}'))
         )
    `;

    if (query?.role) {
      havingClause += ` AND $${pIdx} = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}'))`;
      params.push(query.role);
      pIdx++;
    }

    const countSql = `
      SELECT count(*)::int as total FROM (
        SELECT u.id
        ${baseFilter}
        GROUP BY u.id
        ${havingClause}
      ) sub
    `;
    const countRes = await this.dataSource.query(countSql, params);
    const total = countRes[0]?.total || 0;

    const dataSql = `
      SELECT u.id, u.display_name, u.email, u.phone_e164, u.status, u.auth_epoch,
             u.created_at, u.last_login_at,
             COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}') as roles
      ${baseFilter}
      GROUP BY u.id
      ${havingClause}
      ORDER BY u.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1};
    `;

    const dataParams = [...params, limit, offset];
    const rows = await this.dataSource.query(dataSql, dataParams);

    return {
      staff: rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * 8. Create Staff Member (Super Admin Only)
   */
  async createStaff(superAdmin: AuthenticatedUser, dto: CreateStaffDto): Promise<Record<string, unknown>> {
    if (!isSuperAdmin(superAdmin)) {
      throw new ForbiddenException('Staff creation is strictly restricted to super_admin');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = crypto.randomUUID();

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO users (id, email, phone_e164, password_hash, display_name, display_name_en, display_name_bn, status, email_verified_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5, $5, 'active', NOW(), NOW(), NOW())`,
        [userId, email, dto.phoneE164 || null, passwordHash, dto.displayName.trim()],
      );

      const roleRow = await manager.query(`SELECT id FROM roles WHERE code = $1`, [dto.role]);
      if (!roleRow[0]) throw new BadRequestException(`Role code '${dto.role}' not found`);

      await manager.query(
        `INSERT INTO user_roles (user_id, role_id, granted_by, granted_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, roleRow[0].id, superAdmin.id],
      );
    });

    await this.auditService.record({
      actorUserId: superAdmin.id,
      action: 'admin.staff.created',
      resourceType: 'users',
      resourceId: userId,
      reason: `New staff member created with role '${dto.role}'`,
      safeMetadata: { email: dto.email, role: dto.role, displayName: dto.displayName },
    });

    return {
      id: userId,
      email: dto.email,
      displayName: dto.displayName,
      phoneE164: dto.phoneE164,
      role: dto.role,
      status: 'active',
    };
  }

  /**
   * 9. Update Staff Member (Super Admin Only)
   */
  async updateStaff(superAdmin: AuthenticatedUser, staffId: string, dto: UpdateStaffDto): Promise<Record<string, unknown>> {
    if (!isSuperAdmin(superAdmin)) {
      throw new ForbiddenException('Staff management is strictly restricted to super_admin');
    }

    const staffUser = await this.userRepo.findOne({ where: { id: staffId } });
    if (!staffUser) throw new NotFoundException(`Staff user ${staffId} not found`);

    const rolesRes = await this.dataSource.query(
      `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.revoked_at IS NULL`,
      [staffId],
    );
    const existingRoles = rolesRes.map((r: { code: string }) => r.code);
    if (existingRoles.includes('super_admin')) {
      throw new ForbiddenException('Cannot modify super_admin through staff endpoints');
    }

    if (dto.displayName) staffUser.displayName = dto.displayName;
    if (dto.phoneE164 !== undefined) staffUser.phoneE164 = dto.phoneE164;
    if (dto.status) {
      staffUser.status = dto.status as any;
      if (dto.status === 'suspended' || dto.status === 'banned') {
        staffUser.authEpoch = (staffUser.authEpoch || 0) + 1;
      }
    }

    await this.userRepo.save(staffUser);

    if (dto.role) {
      const roleRow = await this.dataSource.query(`SELECT id FROM roles WHERE code = $1`, [dto.role]);
      if (roleRow[0]) {
        await this.dataSource.query(`UPDATE user_roles SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [staffId]);
        await this.dataSource.query(
          `INSERT INTO user_roles (user_id, role_id, granted_by, granted_at) VALUES ($1, $2, $3, NOW())`,
          [staffId, roleRow[0].id, superAdmin.id],
        );
      }
    }

    await this.auditService.record({
      actorUserId: superAdmin.id,
      action: 'admin.staff.updated',
      resourceType: 'users',
      resourceId: staffId,
      reason: 'Staff profile updated by super_admin',
      safeMetadata: { updates: dto },
    });

    return { id: staffId, displayName: staffUser.displayName, status: staffUser.status };
  }

  /**
   * 10. Delete Staff Member (Super Admin Only)
   */
  async deleteStaff(superAdmin: AuthenticatedUser, staffId: string): Promise<void> {
    if (!isSuperAdmin(superAdmin)) {
      throw new ForbiddenException('Staff deletion is strictly restricted to super_admin');
    }

    const rolesRes = await this.dataSource.query(
      `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.revoked_at IS NULL`,
      [staffId],
    );
    const existingRoles = rolesRes.map((r: { code: string }) => r.code);
    if (existingRoles.includes('super_admin')) {
      throw new ForbiddenException('Cannot delete super_admin');
    }

    await this.dataSource.query(
      `UPDATE users SET deleted_at = NOW(), status = 'banned', auth_epoch = COALESCE(auth_epoch, 0) + 1 WHERE id = $1`,
      [staffId],
    );

    await this.dataSource.query(
      `UPDATE user_roles SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [staffId],
    );

    await this.auditService.record({
      actorUserId: superAdmin.id,
      action: 'admin.staff.deleted',
      resourceType: 'users',
      resourceId: staffId,
      reason: 'Staff member deleted and tokens revoked by super_admin',
    });
  }

  /**
   * 11. Force Logout: Bump auth_epoch to immediately terminate user's active session
   */
  async forceLogout(adminUser: AuthenticatedUser, targetUserId: string): Promise<{ success: boolean; message: string }> {
    const rolesRes = await this.dataSource.query(
      `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.revoked_at IS NULL`,
      [targetUserId],
    );
    const targetRoles = rolesRes.map((r: { code: string }) => r.code);
    if (targetRoles.includes('super_admin') && !isSuperAdmin(adminUser)) {
      throw new ForbiddenException('Only super_admin can force logout another super_admin');
    }

    await this.dataSource.query(
      `UPDATE users SET auth_epoch = COALESCE(auth_epoch, 0) + 1 WHERE id = $1`,
      [targetUserId],
    );

    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.user.force_logout',
      resourceType: 'users',
      resourceId: targetUserId,
      reason: 'Administrator terminated active login session',
    });

    return {
      success: true,
      message: 'Active sessions for user have been terminated immediately.',
    };
  }

  /**
   * 12. List Students and Guardians with Explicit Persona Partitioning and Scalable Backend Pagination:
   *     - Standalone Student (adult, independent, no guardian linked - can pay & book)
   *     - Child Student (minor linked to guardian - cannot pay)
   *     - Guardian (parent managing linked children & payments)
   */
  async listStudentsAndGuardians(query?: {
    search?: string;
    status?: string;
    userType?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    learners: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 10));
    const offset = (page - 1) * limit;

    let whereClause = `WHERE u.deleted_at IS NULL`;
    const params: any[] = [];
    let pIdx = 1;

    if (query?.search) {
      whereClause += ` AND (u.display_name ILIKE $${pIdx} OR u.email ILIKE $${pIdx} OR u.phone_e164 ILIKE $${pIdx})`;
      params.push(`%${query.search.trim()}%`);
      pIdx++;
    }

    if (query?.status) {
      whereClause += ` AND u.status = $${pIdx}`;
      params.push(query.status);
      pIdx++;
    }

    if (query?.userType === 'guardian') {
      whereClause += ` AND r.code = 'guardian'`;
    } else if (query?.userType === 'child_student') {
      whereClause += ` AND r.code = 'student' AND gsl_child.guardian_user_id IS NOT NULL`;
    } else if (query?.userType === 'standalone_student') {
      whereClause += ` AND r.code = 'student' AND gsl_child.guardian_user_id IS NULL`;
    }

    const countSql = `
      SELECT count(DISTINCT u.id)::int as total
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
      JOIN roles r ON ur.role_id = r.id AND (r.code = 'student' OR r.code = 'guardian')
      LEFT JOIN guardian_student_links gsl_child ON gsl_child.student_user_id = u.id AND gsl_child.status = 'active'
      ${whereClause}
    `;
    const countRes = await this.dataSource.query(countSql, params);
    const total = countRes[0]?.total || 0;

    const sql = `
      SELECT u.id, u.display_name, u.email, u.phone_e164, u.status, u.created_at, u.last_login_at,
             COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}') as roles,
             gsl_child.guardian_user_id as linked_guardian_id,
             gu.display_name as linked_guardian_name,
             gu.email as linked_guardian_email,
             COALESCE(
               json_agg(DISTINCT jsonb_build_object('id', cu.id, 'name', cu.display_name, 'email', cu.email))
               FILTER (WHERE cu.id IS NOT NULL),
               '[]'
             ) as linked_children
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
      JOIN roles r ON ur.role_id = r.id AND (r.code = 'student' OR r.code = 'guardian')
      LEFT JOIN guardian_student_links gsl_child ON gsl_child.student_user_id = u.id AND gsl_child.status = 'active'
      LEFT JOIN users gu ON gsl_child.guardian_user_id = gu.id
      LEFT JOIN guardian_student_links gsl_parent ON gsl_parent.guardian_user_id = u.id AND gsl_parent.status = 'active'
      LEFT JOIN users cu ON gsl_parent.student_user_id = cu.id
      ${whereClause}
      GROUP BY u.id, gsl_child.guardian_user_id, gu.display_name, gu.email
      ORDER BY u.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1};
    `;

    const dataParams = [...params, limit, offset];
    const rows = await this.dataSource.query(sql, dataParams);

    const learners = rows.map((row: any) => {
      const isStudent = row.roles.includes('student');
      const isGuardian = row.roles.includes('guardian');

      let userType = 'unknown';
      let canMakeDirectPayment = false;
      let personaLabelEn = '';
      let personaLabelBn = '';

      if (isGuardian) {
        userType = 'guardian';
        canMakeDirectPayment = true;
        personaLabelEn = 'Guardian (Parent)';
        personaLabelBn = 'অভিভাবক (প্যারেন্ট)';
      } else if (isStudent) {
        if (row.linked_guardian_id) {
          userType = 'child_student';
          canMakeDirectPayment = false;
          personaLabelEn = 'Child Student (Under Guardian)';
          personaLabelBn = 'সন্তান শিক্ষার্থী (অভিভাবকের অধীনস্থ)';
        } else {
          userType = 'standalone_student';
          canMakeDirectPayment = true;
          personaLabelEn = 'Standalone Student (Independent Adult)';
          personaLabelBn = 'স্বাধীন শিক্ষার্থী (প্রাপ্তবয়স্ক শিক্ষার্থী)';
        }
      }

      return {
        id: row.id,
        displayName: row.display_name,
        email: row.email,
        phoneE164: row.phone_e164,
        status: row.status,
        roles: row.roles,
        userType,
        canMakeDirectPayment,
        personaLabelEn,
        personaLabelBn,
        linkedGuardian: row.linked_guardian_id
          ? {
              id: row.linked_guardian_id,
              name: row.linked_guardian_name,
              email: row.linked_guardian_email,
            }
          : null,
        linkedChildren: row.linked_children,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
      };
    });

    return {
      learners,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * 13. Dedicated 360° Dossier for a Student or Guardian
   */
  async getStudentOrGuardianDossier(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const rolesRes: Array<{ code: string }> = await this.dataSource.query(
      `SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1 AND ur.revoked_at IS NULL`,
      [userId],
    );
    const roles = rolesRes.map((r) => r.code);

    // Linked guardian (if child student)
    const guardianLink = await this.dataSource.query(
      `SELECT gsl.*, u.display_name as guardian_name, u.email as guardian_email, u.phone_e164 as guardian_phone
       FROM guardian_student_links gsl
       JOIN users u ON gsl.guardian_user_id = u.id
       WHERE gsl.student_user_id = $1 AND gsl.status = 'active'`,
      [userId],
    );

    // Linked children (if guardian)
    const childrenLinks = await this.dataSource.query(
      `SELECT gsl.*, u.display_name as student_name, u.email as student_email, u.phone_e164 as student_phone
       FROM guardian_student_links gsl
       JOIN users u ON gsl.student_user_id = u.id
       WHERE gsl.guardian_user_id = $1 AND gsl.status = 'active'`,
      [userId],
    );

    // Tuition requests
    const tuitionRequests = await this.dataSource.query(
      `SELECT tr.id, tr.request_reference, tr.student_name, tr.learning_mode,
              tr.status, tr.salary_budget_min, tr.salary_budget_max, tr.district, tr.area, tr.created_at
       FROM tuition_requests tr
       WHERE (tr.student_user_id = $1 OR tr.guardian_user_id = $1)
       ORDER BY tr.created_at DESC LIMIT 20`,
      [userId],
    );

    // Bookings
    const bookings = await this.dataSource.query(
      `SELECT b.id, b.booking_reference, b.status, b.price_per_session_minor, b.currency, b.mode, b.created_at,
              u.display_name as tutor_name
       FROM bookings b
       LEFT JOIN users u ON b.tutor_user_id = u.id
       WHERE (b.student_user_id = $1 OR b.requester_user_id = $1)
       ORDER BY b.created_at DESC LIMIT 20`,
      [userId],
    );

    // Audit logs
    const auditLogs = await this.dataSource.query(
      `SELECT al.*, u.display_name as actor_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       WHERE al.resource_id = $1
       ORDER BY al.created_at DESC LIMIT 30`,
      [userId],
    );

    const isStudent = roles.includes('student');
    const isGuardian = roles.includes('guardian');
    let userType = 'unknown';
    let canMakeDirectPayment = false;
    let personaLabelEn = '';
    let personaLabelBn = '';

    if (isGuardian) {
      userType = 'guardian';
      canMakeDirectPayment = true;
      personaLabelEn = 'Guardian (Parent)';
      personaLabelBn = 'অভিভাবক (প্যারেন্ট)';
    } else if (isStudent) {
      if (guardianLink.length > 0) {
        userType = 'child_student';
        canMakeDirectPayment = false;
        personaLabelEn = 'Child Student (Under Guardian)';
        personaLabelBn = 'সন্তান শিক্ষার্থী (অভিভাবকের অধীনস্থ)';
      } else {
        userType = 'standalone_student';
        canMakeDirectPayment = true;
        personaLabelEn = 'Standalone Student (Independent Adult)';
        personaLabelBn = 'স্বাধীন শিক্ষার্থী (প্রাপ্তবয়স্ক শিক্ষার্থী)';
      }
    }

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        phoneE164: user.phoneE164,
        status: user.status,
        preferredLocale: user.preferredLocale,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        authEpoch: user.authEpoch,
      },
      roles,
      userType,
      canMakeDirectPayment,
      personaLabelEn,
      personaLabelBn,
      linkedGuardian: guardianLink[0]
        ? {
            id: guardianLink[0].guardian_user_id,
            name: guardianLink[0].guardian_name,
            email: guardianLink[0].guardian_email,
            phone: guardianLink[0].guardian_phone,
            relationship: guardianLink[0].relationship_type,
            linkedAt: guardianLink[0].created_at,
          }
        : null,
      linkedChildren: childrenLinks.map((c: any) => ({
        id: c.student_user_id,
        name: c.student_name,
        email: c.student_email,
        phone: c.student_phone,
        relationship: c.relationship_type,
        linkedAt: c.created_at,
      })),
      tuitionRequests,
      bookings,
      auditLogs,
    };
  }

  /**
   * 14. Administrative Edit of Student or Guardian with Audit Trail
   */
  async updateStudentOrGuardian(
    actorUser: AuthenticatedUser,
    userId: string,
    dto: { displayName?: string; phoneE164?: string; status?: string; preferredLocale?: string },
  ): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const before = {
      displayName: user.displayName,
      phoneE164: user.phoneE164,
      status: user.status,
      preferredLocale: user.preferredLocale,
    };

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName.trim();
      user.displayNameEn = dto.displayName.trim();
      user.displayNameBn = dto.displayName.trim();
    }
    if (dto.phoneE164 !== undefined) {
      user.phoneE164 = dto.phoneE164.trim() || null;
    }
    if (dto.status !== undefined) {
      user.status = dto.status as any;
      if (dto.status === 'suspended' || dto.status === 'banned') {
        user.authEpoch += 1;
      }
    }
    if (dto.preferredLocale !== undefined) {
      user.preferredLocale = dto.preferredLocale as any;
    }

    await this.userRepo.save(user);

    const after = {
      displayName: user.displayName,
      phoneE164: user.phoneE164,
      status: user.status,
      preferredLocale: user.preferredLocale,
    };

    await this.auditService.record({
      actorUserId: actorUser.id,
      action: 'admin.student_guardian.updated',
      resourceType: 'users',
      resourceId: userId,
      reason: `Administrative update by ${actorUser.email || actorUser.id}`,
      safeMetadata: { before, after, updatedBy: actorUser.email || actorUser.id },
    });

    return { success: true, user };
  }
}

