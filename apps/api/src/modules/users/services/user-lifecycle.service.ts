import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { StudentProfileEntity } from '../entities/student-profile.entity';
import { AuthSessionEntity } from '../../auth/entities/auth-session.entity';
import { GuardianStudentLinkEntity } from '../../guardians/entities/guardian-student-link.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { AuditService } from '../../audit/audit.service';

/**
 * Compliance lifecycle: GDPR-style data export + guarded self-deletion with
 * escrow invariant, session revocation, and audit trail.
 * Extracted from UsersService (Phase 23 P1-4b) — compliance flows live here;
 * identity reads stay in UsersService.
 */
@Injectable()
export class UserLifecycleService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessionRepository: Repository<AuthSessionEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly guardianLinkRepository: Repository<GuardianStudentLinkEntity>,
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Optional()
    @InjectRepository(BookingEntity)
    private readonly bookingRepository?: Repository<BookingEntity>,
  ) {}

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const studentProfile = await this.studentProfileRepository.findOne({
      where: { userId },
    });

    const activeSessions = await this.sessionRepository.find({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        userAgent: true,
      },
    });

    const guardianLinks = await this.guardianLinkRepository.find({
      where: [{ guardianUserId: userId }, { studentUserId: userId }],
    });

    const auditHistory = await this.auditService.getUserAuditHistory(userId, 50);

    const userBookings = this.bookingRepository
      ? await this.bookingRepository.find({
          where: [{ requesterUserId: userId }, { studentUserId: userId }, { tutorUserId: userId }],
          select: {
            id: true,
            status: true,
            mode: true,
            pricePerSessionMinor: true,
            currency: true,
            durationMinutes: true,
            createdAt: true,
          },
        })
      : [];

    await this.auditService.record({
      actorUserId: userId,
      action: 'user.data.exported',
      resourceType: 'user',
      resourceId: userId,
      safeMetadata: {
        exportTimestamp: new Date().toISOString(),
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        phoneE164: user.phoneE164,
        displayName: user.displayName,
        preferredLocale: user.preferredLocale,
        status: user.status,
        createdAt: user.createdAt,
      },
      studentProfile: studentProfile || null,
      activeSessions: activeSessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
        userAgent: s.userAgent,
      })),
      familyLinks: guardianLinks.map((l) => ({
        id: l.id,
        relationshipType: l.relationshipType,
        status: l.status,
        consentPolicyVersion: l.consentPolicyVersion,
        consentRecordedAt: l.consentRecordedAt,
        isGuardian: l.guardianUserId === userId,
      })),
      bookings: userBookings,
      auditHistoryCount: auditHistory.length,
    };
  }

  async deleteAccount(
    userId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Invariant: Cannot self-delete if user has active tutoring bookings or escrow commitments
    if (this.bookingRepository) {
      const activeBookings = await this.bookingRepository.find({
        where: [
          {
            requesterUserId: userId,
            status: In(['requested', 'accepted', 'confirmed', 'in_progress']),
          },
          {
            tutorUserId: userId,
            status: In(['requested', 'accepted', 'confirmed', 'in_progress']),
          },
          {
            studentUserId: userId,
            status: In(['requested', 'accepted', 'confirmed', 'in_progress']),
          },
        ],
      });

      if (activeBookings.length > 0) {
        throw new BadRequestException(
          'Cannot delete account while you have active tutoring bookings or unreleased escrow holdings. Please complete or cancel pending bookings first.',
        );
      }
    }

    // Set user account to deletion_pending status (30-day compliance retention period)
    user.status = 'deletion_pending';
    await this.userRepository.save(user);

    // Revoke all active user sessions
    await this.sessionRepository.update(
      { userId, revokedAt: IsNull() },
      {
        revokedAt: new Date(),
        revokeReason: 'account_deletion_requested',
      },
    );

    await this.auditService.record({
      actorUserId: userId,
      action: 'user.account.deletion_requested',
      resourceType: 'user',
      resourceId: userId,
      reason: reason || 'User requested self-deletion',
      safeMetadata: {
        status: 'deletion_pending',
        retentionHoldDays: 30,
      },
    });

    return {
      success: true,
      message:
        'Account deletion scheduled. Your account is now in deletion_pending status and will be purged following the 30-day compliance hold.',
    };
  }
}
