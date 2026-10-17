import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import type { NotificationRole } from '@ogroniedu/contracts';
import { UserEntity } from '../../auth/entities/user.entity';
import { RoleEntity } from '../../auth/entities/role.entity';
import { UserRoleEntity } from '../../auth/entities/user-role.entity';
import { TUTOR_REVIEW_ROLES } from '../../../common/auth/role.utils';

export interface VerificationReviewerRecipient {
  userId: string;
  roles: string[];
  /** Role claimed on the notification, must be eligible for the event type. */
  notificationRole: NotificationRole;
}

/**
 * Resolves the *recipients* of tutor-verification queue notifications from the
 * real business event: users who currently hold an active reviewer grant.
 * Revoked grants and non-active accounts are excluded, so a suspended reviewer
 * never receives dossier alerts.
 */
@Injectable()
export class TutorVerificationReviewerDirectoryService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
  ) {}

  async findActiveReviewers(): Promise<VerificationReviewerRecipient[]> {
    const roles = await this.roleRepo.find({ where: { code: In([...TUTOR_REVIEW_ROLES]) } });
    if (roles.length === 0) return [];
    const roleCodeById = new Map(roles.map((role) => [role.id, role.code]));

    const grants = await this.userRoleRepo.find({
      where: { roleId: In(roles.map((role) => role.id)), revokedAt: IsNull() },
    });
    if (grants.length === 0) return [];

    const userIds = [...new Set(grants.map((grant) => grant.userId))];
    const activeUsers = await this.userRepo.find({
      where: { id: In(userIds), status: 'active', deletedAt: IsNull() },
    });
    const activeIds = new Set(activeUsers.map((user) => user.id));

    const rolesByUser = new Map<string, string[]>();
    for (const grant of grants) {
      if (!activeIds.has(grant.userId)) continue;
      const code = roleCodeById.get(grant.roleId);
      if (!code) continue;
      const current = rolesByUser.get(grant.userId) ?? [];
      if (!current.includes(code)) current.push(code);
      rolesByUser.set(grant.userId, current);
    }

    return [...rolesByUser.entries()].map(([userId, userRoles]) => ({
      userId,
      roles: userRoles,
      notificationRole: pickNotificationRole(userRoles),
    }));
  }

  /** Reviewer user ids for a specific role set (used by queue scoping). */
  async findReviewerIdsByRole(role: string): Promise<string[]> {
    const roleRow = await this.roleRepo.findOne({ where: { code: role } });
    if (!roleRow) return [];
    const grants = await this.userRoleRepo.find({
      where: { roleId: roleRow.id, revokedAt: IsNull() },
    });
    return grants.map((grant) => grant.userId);
  }
}

function pickNotificationRole(roles: readonly string[]): NotificationRole {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('super_admin')) return 'super_admin';
  return 'compliance_reviewer';
}
