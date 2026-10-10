import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { StudentProfileEntity } from './entities/student-profile.entity';
import { AuthSessionEntity } from '../auth/entities/auth-session.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { AuditService } from '../audit/audit.service';
import { UpdateProfileDto, UpsertStudentProfileDto } from './dto';

export interface UserProfileResponse {
  id: string;
  email: string | null;
  phoneE164: string | null;
  displayName: string;
  preferredLocale: 'bn' | 'en';
  status: string;
  roles: string[];
  isMinor: boolean;
  studentProfile?: {
    dateOfBirth: string | null;
    educationLevelId: string | null;
    curriculumId: string | null;
    institutionName: string | null;
    stream: string | null;
    districtCode: string | null;
    upazilaCode: string | null;
    learningGoals: string | null;
    profileVisibility: 'private' | 'limited';
  } | null;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessionRepository: Repository<AuthSessionEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly guardianLinkRepository: Repository<GuardianStudentLinkEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    @InjectRepository(BookingEntity)
    private readonly bookingRepository?: Repository<BookingEntity>,
  ) {}

  /**
   * Helper to calculate whether a student is under 18 years old (Minor status in Bangladesh)
   */
  isMinor(dateOfBirth: string | null | undefined): boolean {
    if (!dateOfBirth) return false;
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age < 18;
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    // Fetch user roles
    const rolesResult = await this.dataSource.query(
      `SELECT r.code FROM roles r 
       JOIN user_roles ur ON ur.role_id = r.id 
       WHERE ur.user_id = $1 AND ur.revoked_at IS NULL`,
      [userId],
    );
    const roles: string[] = rolesResult.map((r: { code: string }) => r.code);

    let studentProfileData: StudentProfileEntity | null = null;
    if (roles.includes('student')) {
      studentProfileData = await this.studentProfileRepository.findOne({
        where: { userId },
      });
    }

    const minor = this.isMinor(studentProfileData?.dateOfBirth);

    return {
      id: user.id,
      email: user.email,
      phoneE164: user.phoneE164,
      displayName: user.displayName,
      preferredLocale: user.preferredLocale,
      status: user.status,
      roles,
      isMinor: minor,
      studentProfile: studentProfileData
        ? {
            dateOfBirth: studentProfileData.dateOfBirth,
            educationLevelId: studentProfileData.educationLevelId,
            curriculumId: studentProfileData.curriculumId,
            institutionName: studentProfileData.institutionName,
            stream: studentProfileData.stream,
            districtCode: studentProfileData.districtCode,
            upazilaCode: studentProfileData.upazilaCode,
            learningGoals: studentProfileData.learningGoals,
            profileVisibility: studentProfileData.profileVisibility,
          }
        : null,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }
    if (dto.preferredLocale !== undefined) {
      user.preferredLocale = dto.preferredLocale;
    }

    await this.userRepository.save(user);

    await this.auditService.record({
      actorUserId: userId,
      action: 'user.profile.updated',
      resourceType: 'user',
      resourceId: userId,
      safeMetadata: {
        updatedFields: Object.keys(dto),
      },
    });

    return this.getProfile(userId);
  }

  async upsertStudentProfile(
    userId: string,
    dto: UpsertStudentProfileDto,
  ): Promise<StudentProfileEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let profile = await this.studentProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.studentProfileRepository.create({
        userId,
        dateOfBirth: dto.dateOfBirth ?? null,
        educationLevelId: dto.educationLevelId ?? null,
        curriculumId: dto.curriculumId ?? null,
        institutionName: dto.institutionName ?? null,
        stream: dto.stream ?? null,
        districtCode: dto.districtCode ?? null,
        upazilaCode: dto.upazilaCode ?? null,
        learningGoals: dto.learningGoals ?? null,
        profileVisibility: dto.profileVisibility ?? 'private',
      });
    } else {
      if (dto.dateOfBirth !== undefined) profile.dateOfBirth = dto.dateOfBirth;
      if (dto.educationLevelId !== undefined) profile.educationLevelId = dto.educationLevelId;
      if (dto.curriculumId !== undefined) profile.curriculumId = dto.curriculumId;
      if (dto.institutionName !== undefined) profile.institutionName = dto.institutionName;
      if (dto.stream !== undefined) profile.stream = dto.stream;
      if (dto.districtCode !== undefined) profile.districtCode = dto.districtCode;
      if (dto.upazilaCode !== undefined) profile.upazilaCode = dto.upazilaCode;
      if (dto.learningGoals !== undefined) profile.learningGoals = dto.learningGoals;
      if (dto.profileVisibility !== undefined) profile.profileVisibility = dto.profileVisibility;
    }

    const saved = await this.studentProfileRepository.save(profile);

    await this.auditService.record({
      actorUserId: userId,
      action: 'student.profile.updated',
      resourceType: 'student_profile',
      resourceId: userId,
      safeMetadata: {
        profileVisibility: saved.profileVisibility,
      },
    });

    return saved;
  }

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
      { userId, revokedAt: undefined },
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
