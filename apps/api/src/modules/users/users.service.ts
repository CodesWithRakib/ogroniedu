import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { StudentProfileEntity } from './entities/student-profile.entity';
import { AuditService } from '../audit/audit.service';
import { StudentProfileService } from './services/student-profile.service';
import { UserLifecycleService } from './services/user-lifecycle.service';
import { UpdateProfileDto, UpsertStudentProfileDto } from './dto';
import { isMinor as isMinorAge } from '../../common/utils/age.util';
import type { UserProfileResponse } from './interfaces/user-profile-response.interface';

export type { UserProfileResponse } from './interfaces/user-profile-response.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(StudentProfileService)
    private readonly studentProfiles: StudentProfileService,
    @Inject(UserLifecycleService)
    private readonly lifecycle: UserLifecycleService,
  ) {}

  /**
   * Helper to calculate whether a student is under 18 years old (Minor status in Bangladesh).
   * Delegates to the shared age gate (kept as a method for backward compatibility).
   */
  isMinor(dateOfBirth: string | null | undefined): boolean {
    return isMinorAge(dateOfBirth);
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
    let guardianLinkData: { id: string; guardian_user_id: string; guardian_name: string; guardian_email: string | null; guardian_phone: string | null } | null = null;

    if (roles.includes('student')) {
      studentProfileData = await this.studentProfileRepository.findOne({
        where: { userId },
      });

      const guardianLinkRows = await this.dataSource.query(
        `SELECT gsl.id, gsl.guardian_user_id, u.display_name as guardian_name, u.email as guardian_email, u.phone_e164 as guardian_phone
         FROM guardian_student_links gsl
         JOIN users u ON u.id = gsl.guardian_user_id
         WHERE gsl.student_user_id = $1 AND gsl.status = 'active'
         LIMIT 1;`,
        [userId],
      );
      if (guardianLinkRows.length > 0) {
        guardianLinkData = guardianLinkRows[0];
      }
    }

    const hasGuardian = Boolean(guardianLinkData);
    const minor = hasGuardian || this.isMinor(studentProfileData?.dateOfBirth);
    const isStandalone = roles.includes('student') && !hasGuardian && !minor;

    return {
      id: user.id,
      email: user.email,
      phoneE164: user.phoneE164,
      displayName: user.displayName,
      preferredLocale: user.preferredLocale,
      status: user.status,
      roles,
      isMinor: minor,
      hasGuardian,
      isStandalone,
      guardianInfo: guardianLinkData
        ? {
            id: guardianLinkData.id,
            guardianUserId: guardianLinkData.guardian_user_id,
            guardianName: guardianLinkData.guardian_name,
            guardianEmail: guardianLinkData.guardian_email,
            guardianPhone: guardianLinkData.guardian_phone,
          }
        : null,
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
    return this.studentProfiles.upsertStudentProfile(userId, dto);
  }

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    return this.lifecycle.exportUserData(userId);
  }

  async deleteAccount(
    userId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.lifecycle.deleteAccount(userId, reason);
  }
}
