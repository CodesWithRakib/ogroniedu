import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { RoleEntity } from '../../auth/entities/role.entity';
import { UserRoleEntity } from '../../auth/entities/user-role.entity';
import { StudentProfileEntity } from '../../users/entities/student-profile.entity';
import { GuardianStudentLinkEntity } from '../entities/guardian-student-link.entity';
import { AuditService } from '../../audit/audit.service';
import { RegisterChildDto } from '../dto';
import { assertGuardianConsent } from '../utils/guardian-consent.util';
import { APPROVED_CONSENT_POLICY } from '../constants/guardian-policy.constants';
import { isMinor as isMinorAge } from '../../../common/utils/age.util';
import type { LinkedChildSummary } from '../interfaces/linked-child-summary.interface';

/**
 * Child provisioning: guardian-created student accounts (user + role +
 * profile + active link in one transaction).
 * Extracted from GuardiansService (Phase 23 P1-4b) — provisioning lives
 * here; link-request workflows stay in GuardiansService.
 */
@Injectable()
export class GuardianProvisioningService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  async registerChild(guardianUserId: string, dto: RegisterChildDto): Promise<LinkedChildSummary> {
    assertGuardianConsent(dto, APPROVED_CONSENT_POLICY);

    const guardian = await this.userRepository.findOne({ where: { id: guardianUserId } });
    if (!guardian) {
      throw new NotFoundException('Guardian user not found');
    }

    // Check duplicate email or phone if provided
    if (dto.email) {
      const existingEmail = await this.userRepository
        .createQueryBuilder('u')
        .where('LOWER(u.email) = :email', { email: dto.email.toLowerCase() })
        .getOne();
      if (existingEmail) {
        throw new ConflictException('A user account with this email already exists');
      }
    }

    if (dto.phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phoneE164: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('A user account with this phone number already exists');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create student UserEntity
      const studentUser = queryRunner.manager.create(UserEntity, {
        displayName: dto.displayName,
        email: dto.email ? dto.email.toLowerCase() : null,
        phoneE164: dto.phone ?? null,
        preferredLocale: guardian.preferredLocale,
        status: 'active',
        emailVerifiedAt: dto.email ? new Date() : null,
        phoneVerifiedAt: dto.phone ? new Date() : null,
      });
      const savedStudent = await queryRunner.manager.save(studentUser);

      // 2. Assign 'student' role
      const studentRole = await queryRunner.manager.findOne(RoleEntity, {
        where: { code: 'student' },
      });
      if (studentRole) {
        const userRole = queryRunner.manager.create(UserRoleEntity, {
          userId: savedStudent.id,
          roleId: studentRole.id,
          grantedBy: guardianUserId,
          grantedAt: new Date(),
        });
        await queryRunner.manager.save(userRole);
      }

      // 3. Create StudentProfileEntity with generated Student Code
      const studentCode = 'STU-' + Math.floor(100000 + Math.random() * 900000);
      const studentProfile = queryRunner.manager.create(StudentProfileEntity, {
        userId: savedStudent.id,
        studentCode,
        dateOfBirth: dto.dateOfBirth ?? null,
        educationLevelId: dto.educationLevelId ?? null,
        curriculumId: dto.curriculumId ?? null,
        institutionName: dto.institutionName ?? null,
        stream: dto.stream ?? null,
        learningGoals: dto.learningGoals ?? null,
        profileVisibility: 'private',
      });
      await queryRunner.manager.save(studentProfile);

      // 4. Create active GuardianStudentLinkEntity (since parent created account directly)
      const link = queryRunner.manager.create(GuardianStudentLinkEntity, {
        guardianUserId,
        studentUserId: savedStudent.id,
        relationshipType: dto.relationshipType,
        status: 'active',
        consentPolicyVersion: dto.consentPolicyVersion,
        consentRecordedAt: new Date(),
        verifiedBy: guardianUserId,
      });
      const savedLink = await queryRunner.manager.save(link);

      await queryRunner.commitTransaction();

      await this.auditService.record({
        actorUserId: guardianUserId,
        action: 'guardian.child.registered',
        resourceType: 'guardian_student_link',
        resourceId: savedLink.id,
        safeMetadata: {
          studentId: savedStudent.id,
          relationshipType: dto.relationshipType,
          consentPolicyVersion: dto.consentPolicyVersion,
        },
      });

      return {
        linkId: savedLink.id,
        studentId: savedStudent.id,
        displayName: savedStudent.displayName,
        relationshipType: savedLink.relationshipType,
        status: savedLink.status,
        consentPolicyVersion: savedLink.consentPolicyVersion,
        consentRecordedAt: savedLink.consentRecordedAt,
        isMinor: isMinorAge(dto.dateOfBirth),
        studentProfile: {
          dateOfBirth: studentProfile.dateOfBirth,
          educationLevelId: studentProfile.educationLevelId,
          curriculumId: studentProfile.curriculumId,
          institutionName: studentProfile.institutionName,
          stream: studentProfile.stream,
          learningGoals: studentProfile.learningGoals,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
