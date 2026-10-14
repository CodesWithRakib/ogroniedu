import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { redactSensitiveData } from '../utils/redact.util';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isSuperAdmin } from '../../../common/auth/role.utils';
import { SuspendUserDto, UpdateUserRolesDto } from '../dto';

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

    sql += ` GROUP BY u.id`;

    if (query.role) {
      sql += ` HAVING $${pIdx} = ANY(COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL AND ur.revoked_at IS NULL), '{}'))`;
      params.push(query.role);
      pIdx++;
    }

    sql += ` ORDER BY u.created_at DESC LIMIT $${pIdx} OFFSET $${pIdx + 1};`;
    params.push(limit, offset);

    const rows: Array<Record<string, unknown>> = await this.dataSource.query(sql, params);

    const countRes: Array<{ total: number }> = await this.dataSource.query(
      `SELECT count(*)::int as total FROM users WHERE deleted_at IS NULL;`,
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
    const roleRows: Array<{ id: string; code: string }> = await this.dataSource.query(
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
}
