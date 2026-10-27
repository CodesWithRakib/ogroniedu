import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { SafetyActionEntity, SafetyActionType } from '../entities/safety-action.entity';
import { BannedIdentityEntity } from '../entities/banned-identity.entity';
import { NotificationService } from '../../notifications/notification.service';
import { NotificationGateway } from '../../notifications/notification.gateway';
import { BookingMessagesService } from '../../notifications/booking-messages.service';
import type { ISafetyEnforcementPort } from '../../notifications/interfaces/safety-enforcement.interface';
import { AuditService } from '../../audit/audit.service';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

const SYSTEM_BOT_ID = '00000000-0000-4000-a000-000000000000';

export interface EnforcementDecision {
  actionType: 'warning' | 'temporary_suspension' | 'permanent_ban';
  strikeCount: number;
  reason: string;
  isBanned: boolean;
  isSuspended: boolean;
}

@Injectable()
export class UserSafetyEnforcementService implements OnModuleInit, ISafetyEnforcementPort {
  private readonly logger = new Logger(UserSafetyEnforcementService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SafetyActionEntity)
    private readonly safetyActionRepo: Repository<SafetyActionEntity>,
    @InjectRepository(BannedIdentityEntity)
    private readonly bannedIdentityRepo: Repository<BannedIdentityEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly bookingMessagesService: BookingMessagesService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit(): void {
    this.bookingMessagesService.registerSafetyEnforcer(this);
  }

  /**
   * 1. Inspect existing active strikes for a user
   */
  async getUserStrikeHistory(userId: string): Promise<{
    strikeCount: number;
    activeStrikes: SafetyActionEntity[];
    isSuspended: boolean;
    isBanned: boolean;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const activeStrikes = await this.safetyActionRepo.find({
      where: {
        targetUserId: userId,
        revokedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    return {
      strikeCount: activeStrikes.length,
      activeStrikes,
      isSuspended: user.status === 'suspended',
      isBanned: user.status === 'banned',
    };
  }

  /**
   * 2. Automated Violation Strike & Escalation Ladder
   * Strike 1: Warning + Direct Message Redaction
   * Strike 2: 7-Day Account Suspension + JWT Invalidation
   * Strike 3 (or Severe): Permanent Ban + Identity Blacklist
   */
  async handleViolationAndEnforce(
    userId: string,
    details: {
      violationCodes: string[];
      reason: string;
      bookingId?: string;
      messageId?: string;
      severity?: 'warning' | 'severe';
    },
  ): Promise<EnforcementDecision> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    // If user is already permanently banned, do nothing
    if (user.status === 'banned') {
      return {
        actionType: 'permanent_ban',
        strikeCount: 3,
        reason: 'User is already permanently banned',
        isBanned: true,
        isSuspended: true,
      };
    }

    const previousStrikes = await this.safetyActionRepo.count({
      where: { targetUserId: userId, revokedAt: IsNull() },
    });
    const strikeCount = previousStrikes + 1;

    let actionType: 'warning' | 'temporary_suspension' | 'permanent_ban' = 'warning';
    let expiresAt: Date | null = null;

    if (details.severity === 'severe' || strikeCount >= 3) {
      actionType = 'permanent_ban';
    } else if (strikeCount === 2) {
      actionType = 'temporary_suspension';
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days suspension
    } else {
      actionType = 'warning';
    }

    // 1. Record safety action
    const action = this.safetyActionRepo.create({
      targetUserId: userId,
      actionType: actionType as SafetyActionType,
      reason: details.reason,
      appliedBy: SYSTEM_BOT_ID,
      expiresAt,
    });
    await this.safetyActionRepo.save(action);

    // 2. Enforce Status and Session Revocation
    if (actionType === 'permanent_ban') {
      user.status = 'banned';
      user.authEpoch = (user.authEpoch || 0) + 1; // Invalidate all active JWT tokens
      await this.userRepo.save(user);

      // Blacklist identity so they cannot register again
      await this.blacklistUserIdentity(user, details.reason, SYSTEM_BOT_ID);

      // Real-time socket disconnection
      this.notificationGateway.server?.to(`user:${userId}`).emit('account_banned', {
        reason: details.reason,
        bannedAt: new Date().toISOString(),
      });
    } else if (actionType === 'temporary_suspension') {
      user.status = 'suspended';
      user.authEpoch = (user.authEpoch || 0) + 1; // Invalidate active JWT tokens
      await this.userRepo.save(user);

      this.notificationGateway.server?.to(`user:${userId}`).emit('account_suspended', {
        reason: details.reason,
        expiresAt: expiresAt?.toISOString(),
      });
    }

    // 3. Dispatch Notification
    const strikeNoticeBn =
      actionType === 'permanent_ban'
        ? `🚫 আপনার অ্যাকাউন্ট গুরুতর নিয়ম লঙ্ঘনের কারণে চিরতরে নিষিদ্ধ (Permanent Ban) করা হয়েছে। কারণ: ${details.reason}`
        : actionType === 'temporary_suspension'
          ? `⚠️ আপনার অ্যাকাউন্ট ৭ দিনের জন্য সাময়িক বরখাস্ত (Suspended) করা হয়েছে (Strike 2/3)। কারণ: ${details.reason}`
          : `⚠️ প্ল্যাটফর্ম সতর্কবার্তা (Strike 1/3): আপনার বার্তালাপে নিয়মবহির্ভূত বা অশোভন ভাষা শনাক্ত করা হয়েছে। পুনরায় এমন হলে অ্যাকাউন্ট সাময়িক বরখাস্ত হবে।`;

    await this.notificationService
      .dispatch({
        userId,
        recipientRole: 'student',
        eventType: 'safety.alert',
        payload: {
          title: 'নিরাপত্তা ও শৃংখলা নোটিশ',
          message: strikeNoticeBn,
          actionType,
          strikeCount,
        },
      })
      .catch((err) => this.logger.warn(`Failed to dispatch safety strike notification: ${err}`));

    // 4. Audit Log
    await this.auditService.record({
      actorUserId: SYSTEM_BOT_ID,
      action: `trust.safety.${actionType}`,
      resourceType: 'users',
      resourceId: userId,
      reason: details.reason,
      safeMetadata: {
        strikeCount,
        violationCodes: details.violationCodes,
        bookingId: details.bookingId,
        messageId: details.messageId,
      },
    });

    // 5. Broadcast to Admin Oversight Room
    this.notificationGateway.server?.to('admin_oversight').emit('safety_enforcement_event', {
      userId,
      userDisplayName: user.displayName,
      actionType,
      strikeCount,
      reason: details.reason,
      bookingId: details.bookingId,
      timestamp: new Date().toISOString(),
    });

    this.logger.warn(
      `Enforced ${actionType} on user ${userId} (${user.displayName}) - Strike #${strikeCount}: ${details.reason}`,
    );

    return {
      actionType,
      strikeCount,
      reason: details.reason,
      isBanned: user.status === 'banned',
      isSuspended: user.status === 'suspended',
    };
  }

  /**
   * 3. Blacklist User Identity: Phone, Email, National ID (NID), Document Hashes
   */
  async blacklistUserIdentity(user: UserEntity, reason: string, adminId: string): Promise<void> {
    // Extract NID or Birth Certificate number if available in tutor profile or onboarding
    let nidNumber: string | null = null;
    try {
      const tutorProfile = await this.dataSource.query(
        `SELECT id_document_number FROM tutor_profiles WHERE user_id = $1 LIMIT 1`,
        [user.id],
      );
      if (tutorProfile[0]?.id_document_number) {
        nidNumber = tutorProfile[0].id_document_number;
      }
    } catch {
      // safe fallback
    }

    if (!nidNumber) {
      try {
        const onboarding = await this.dataSource.query(
          `SELECT step_data FROM user_onboarding WHERE user_id = $1 LIMIT 1`,
          [user.id],
        );
        const stepData = onboarding[0]?.step_data;
        if (stepData && typeof stepData === 'object') {
          nidNumber = stepData.nid || stepData.nidNumber || stepData.idNumber || null;
        }
      } catch {
        // safe fallback
      }
    }

    // Insert into banned_identities
    const record = this.bannedIdentityRepo.create({
      bannedUserId: user.id,
      phoneE164: user.phoneE164,
      email: user.email?.toLowerCase().trim(),
      nidNumber: nidNumber?.trim() || null,
      reason,
      severity: 'permanent',
      bannedBy: adminId,
    });
    await this.bannedIdentityRepo.save(record);

    this.logger.log(
      `Blacklisted identity for banned user ${user.id} (Phone: ${user.phoneE164}, Email: ${user.email}, NID: ${nidNumber})`,
    );
  }

  /**
   * 4. Identity Blacklist Check (Called during Register, Phone Bind, NID Verification)
   */
  async isIdentityBlacklisted(params: {
    phone?: string;
    email?: string;
    nidNumber?: string;
  }): Promise<{ isBlacklisted: boolean; reason?: string }> {
    const qb = this.bannedIdentityRepo.createQueryBuilder('b');
    const conditions: string[] = [];
    const parameters: Record<string, unknown> = {};

    if (params.phone) {
      conditions.push('b.phone_e164 = :phone');
      parameters.phone = params.phone.trim();
    }
    if (params.email) {
      conditions.push('LOWER(b.email) = :email');
      parameters.email = params.email.toLowerCase().trim();
    }
    if (params.nidNumber) {
      conditions.push('b.nid_number = :nidNumber');
      parameters.nidNumber = params.nidNumber.trim();
    }

    if (conditions.length === 0) {
      return { isBlacklisted: false };
    }

    qb.where(`(${conditions.join(' OR ')})`, parameters);
    const match = await qb.getOne();

    if (match) {
      return {
        isBlacklisted: true,
        reason: match.reason || 'পূর্ববর্তী নিয়ম লঙ্ঘনের কারণে এই তথ্যটি নিষিদ্ধ তালিকায় রয়েছে।',
      };
    }

    return { isBlacklisted: false };
  }

  /**
   * 5. Admin Manual Punitive Actions: Warn, Suspend, Ban, or Pardon
   */
  async executeAdminPunitiveAction(
    adminUser: AuthenticatedUser,
    targetUserId: string,
    dto: {
      actionType: 'warning' | 'temporary_suspension' | 'permanent_ban' | 'pardon';
      reason: string;
      durationDays?: number;
    },
  ): Promise<{ success: boolean; message: string; targetStatus: string }> {
    if (adminUser.id === targetUserId) {
      throw new BadRequestException('Administrators cannot execute punitive actions on themselves');
    }

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException(`User ${targetUserId} not found`);

    if (dto.actionType === 'pardon') {
      // Revoke all active safety actions
      await this.safetyActionRepo.update(
        { targetUserId, revokedAt: IsNull() },
        {
          revokedAt: new Date(),
          revokedBy: adminUser.id,
          revocationReason: dto.reason,
        },
      );
      targetUser.status = 'active';
      await this.userRepo.save(targetUser);

      // Remove from banned identities if present
      await this.bannedIdentityRepo.delete({ bannedUserId: targetUserId });

      await this.auditService.record({
        actorUserId: adminUser.id,
        action: 'admin.safety.pardon',
        resourceType: 'users',
        resourceId: targetUserId,
        reason: dto.reason,
      });

      return {
        success: true,
        message: `ব্যবহারকারী ${targetUser.displayName} এর সকল নিষেধাজ্ঞা প্রত্যাহার করা হয়েছে এবং অ্যাকাউন্ট সচল করা হয়েছে।`,
        targetStatus: targetUser.status,
      };
    }

    let expiresAt: Date | null = null;
    if (dto.actionType === 'temporary_suspension') {
      const days = dto.durationDays || 7;
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      targetUser.status = 'suspended';
      targetUser.authEpoch = (targetUser.authEpoch || 0) + 1;
      await this.userRepo.save(targetUser);
    } else if (dto.actionType === 'permanent_ban') {
      targetUser.status = 'banned';
      targetUser.authEpoch = (targetUser.authEpoch || 0) + 1;
      await this.userRepo.save(targetUser);
      await this.blacklistUserIdentity(targetUser, dto.reason, adminUser.id);
    }

    const action = this.safetyActionRepo.create({
      targetUserId,
      actionType: dto.actionType as SafetyActionType,
      reason: dto.reason,
      appliedBy: adminUser.id,
      expiresAt,
    });
    await this.safetyActionRepo.save(action);

    // Dispatch real-time alert to user socket
    this.notificationGateway.server
      ?.to(`user:${targetUserId}`)
      .emit(dto.actionType === 'permanent_ban' ? 'account_banned' : 'account_suspended', {
        reason: dto.reason,
        appliedByAdmin: true,
        expiresAt: expiresAt?.toISOString(),
      });

    // Audit Log
    await this.auditService.record({
      actorUserId: adminUser.id,
      action: `admin.safety.${dto.actionType}`,
      resourceType: 'users',
      resourceId: targetUserId,
      reason: dto.reason,
      safeMetadata: { durationDays: dto.durationDays, expiresAt },
    });

    return {
      success: true,
      message: `অ্যাকশন সফল: ${dto.actionType} সফলভাবে প্রয়োগ করা হয়েছে।`,
      targetStatus: targetUser.status,
    };
  }
}
