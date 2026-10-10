import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { StudentProfileEntity } from '../users/entities/student-profile.entity';
import { GuardianStudentLinkEntity } from './entities/guardian-student-link.entity';
import { AuditService } from '../audit/audit.service';
import { LinkChildRequestDto, RegisterChildDto, VerifyLinkDto, RevokeLinkDto } from './dto';

export interface LinkedChildSummary {
  linkId: string;
  studentId: string;
  displayName: string;
  relationshipType: string;
  status: 'pending' | 'active' | 'rejected' | 'revoked';
  consentPolicyVersion: string | null;
  consentRecordedAt: Date | null;
  isMinor: boolean;
  studentProfile: {
    dateOfBirth: string | null;
    educationLevelId: string | null;
    curriculumId: string | null;
    institutionName: string | null;
    stream: string | null;
    learningGoals: string | null;
  } | null;
}

@Injectable()
export class GuardiansService {
  private readonly logger = new Logger(GuardiansService.name);
  static readonly APPROVED_CONSENT_POLICY = 'v1.0-bd-minor-consent';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly linkRepository: Repository<GuardianStudentLinkEntity>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  private isMinor(dateOfBirth: string | null | undefined): boolean {
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

  async linkChildRequest(
    guardianUserId: string,
    dto: LinkChildRequestDto,
  ): Promise<GuardianStudentLinkEntity> {
    if (dto.consentPolicyVersion !== GuardiansService.APPROVED_CONSENT_POLICY) {
      throw new BadRequestException(
        `Invalid consent policy version. Must be '${GuardiansService.APPROVED_CONSENT_POLICY}'`,
      );
    }
    if (!dto.consentAgreed) {
      throw new BadRequestException('Explicit guardian consent affirmation is mandatory.');
    }

    const guardian = await this.userRepository.findOne({ where: { id: guardianUserId } });
    if (!guardian) {
      throw new NotFoundException('Guardian user not found');
    }

    // Resolve student by UUID, email, or phone
    const ident = dto.studentIdentifier.trim().toLowerCase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ident);

    let student: UserEntity | null = null;
    if (isUuid) {
      student = await this.userRepository.findOne({ where: { id: ident } });
    } else if (ident.includes('@')) {
      student = await this.userRepository
        .createQueryBuilder('u')
        .where('LOWER(u.email) = :email', { email: ident })
        .getOne();
    } else {
      student = await this.userRepository.findOne({ where: { phoneE164: ident } });
    }

    if (!student) {
      throw new NotFoundException('Student account matching identifier was not found');
    }

    if (student.id === guardianUserId) {
      throw new BadRequestException('A guardian cannot link themselves as a child learner');
    }

    // Check existing link
    const existing = await this.linkRepository.findOne({
      where: {
        guardianUserId,
        studentUserId: student.id,
      },
    });

    if (existing) {
      if (existing.status === 'active') {
        throw new ConflictException('An active guardian link already exists for this student');
      }
      if (existing.status === 'pending') {
        throw new ConflictException('A pending link request is already awaiting verification');
      }
      // If previously revoked or rejected, allow re-requesting
      existing.status = 'pending';
      existing.relationshipType = dto.relationshipType;
      existing.consentPolicyVersion = dto.consentPolicyVersion;
      existing.consentRecordedAt = new Date();
      existing.updatedAt = new Date();
      const updated = await this.linkRepository.save(existing);

      await this.auditService.record({
        actorUserId: guardianUserId,
        action: 'guardian.child.link_re_requested',
        resourceType: 'guardian_student_link',
        resourceId: updated.id,
        safeMetadata: {
          studentId: student.id,
          relationshipType: dto.relationshipType,
          consentPolicyVersion: dto.consentPolicyVersion,
        },
      });

      return updated;
    }

    const link = this.linkRepository.create({
      guardianUserId,
      studentUserId: student.id,
      relationshipType: dto.relationshipType,
      status: 'pending',
      consentPolicyVersion: dto.consentPolicyVersion,
      consentRecordedAt: new Date(),
    });

    const saved = await this.linkRepository.save(link);

    await this.auditService.record({
      actorUserId: guardianUserId,
      action: 'guardian.child.link_requested',
      resourceType: 'guardian_student_link',
      resourceId: saved.id,
      safeMetadata: {
        studentId: student.id,
        relationshipType: dto.relationshipType,
        consentPolicyVersion: dto.consentPolicyVersion,
      },
    });

    return saved;
  }

  async registerChild(guardianUserId: string, dto: RegisterChildDto): Promise<LinkedChildSummary> {
    if (dto.consentPolicyVersion !== GuardiansService.APPROVED_CONSENT_POLICY) {
      throw new BadRequestException(
        `Invalid consent policy version. Must be '${GuardiansService.APPROVED_CONSENT_POLICY}'`,
      );
    }
    if (!dto.consentAgreed) {
      throw new BadRequestException('Explicit guardian consent affirmation is mandatory.');
    }

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

      // 3. Create StudentProfileEntity
      const studentProfile = queryRunner.manager.create(StudentProfileEntity, {
        userId: savedStudent.id,
        dateOfBirth: dto.dateOfBirth ?? null,
        educationLevelId: dto.educationLevelId ?? null,
        curriculumId: dto.curriculumId ?? null,
        institutionName: dto.institutionName ?? null,
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
        isMinor: this.isMinor(dto.dateOfBirth),
        studentProfile: {
          dateOfBirth: studentProfile.dateOfBirth,
          educationLevelId: studentProfile.educationLevelId,
          curriculumId: studentProfile.curriculumId,
          institutionName: studentProfile.institutionName,
          stream: null,
          learningGoals: null,
        },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getLinkedChildren(guardianUserId: string): Promise<LinkedChildSummary[]> {
    const links = await this.linkRepository.find({
      where: { guardianUserId },
      order: { createdAt: 'DESC' },
    });

    const results: LinkedChildSummary[] = [];

    for (const link of links) {
      const studentUser = await this.userRepository.findOne({
        where: { id: link.studentUserId },
      });
      if (!studentUser) continue;

      const profile = await this.studentProfileRepository.findOne({
        where: { userId: link.studentUserId },
      });

      results.push({
        linkId: link.id,
        studentId: studentUser.id,
        displayName: studentUser.displayName,
        relationshipType: link.relationshipType,
        status: link.status,
        consentPolicyVersion: link.consentPolicyVersion,
        consentRecordedAt: link.consentRecordedAt,
        isMinor: this.isMinor(profile?.dateOfBirth),
        studentProfile: profile
          ? {
              dateOfBirth: profile.dateOfBirth,
              educationLevelId: profile.educationLevelId,
              curriculumId: profile.curriculumId,
              institutionName: profile.institutionName,
              stream: profile.stream,
              learningGoals: profile.learningGoals,
            }
          : null,
      });
    }

    return results;
  }

  async getChildDetails(guardianUserId: string, studentId: string): Promise<LinkedChildSummary> {
    const link = await this.linkRepository.findOne({
      where: {
        guardianUserId,
        studentUserId: studentId,
        status: 'active',
      },
    });

    if (!link) {
      throw new ForbiddenException(
        'Access denied: You do not have an active guardian relationship with this student.',
      );
    }

    const studentUser = await this.userRepository.findOne({
      where: { id: studentId },
    });
    if (!studentUser) {
      throw new NotFoundException('Student user not found');
    }

    const profile = await this.studentProfileRepository.findOne({
      where: { userId: studentId },
    });

    return {
      linkId: link.id,
      studentId: studentUser.id,
      displayName: studentUser.displayName,
      relationshipType: link.relationshipType,
      status: link.status,
      consentPolicyVersion: link.consentPolicyVersion,
      consentRecordedAt: link.consentRecordedAt,
      isMinor: this.isMinor(profile?.dateOfBirth),
      studentProfile: profile
        ? {
            dateOfBirth: profile.dateOfBirth,
            educationLevelId: profile.educationLevelId,
            curriculumId: profile.curriculumId,
            institutionName: profile.institutionName,
            stream: profile.stream,
            learningGoals: profile.learningGoals,
          }
        : null,
    };
  }

  async verifyLinkRequest(
    studentUserId: string,
    linkId: string,
    dto: VerifyLinkDto,
  ): Promise<GuardianStudentLinkEntity> {
    const link = await this.linkRepository.findOne({
      where: { id: linkId, studentUserId, status: 'pending' },
    });

    if (!link) {
      throw new NotFoundException('Pending guardian link request not found');
    }

    link.status = dto.decision === 'approve' ? 'active' : 'rejected';
    link.updatedAt = new Date();
    link.verifiedBy = studentUserId;
    const saved = await this.linkRepository.save(link);

    await this.auditService.record({
      actorUserId: studentUserId,
      action: `guardian.child.link_${dto.decision}d`,
      resourceType: 'guardian_student_link',
      resourceId: saved.id,
      safeMetadata: {
        decision: dto.decision,
        guardianUserId: link.guardianUserId,
      },
    });

    return saved;
  }

  async revokeLink(
    actorUserId: string,
    studentId: string,
    dto?: RevokeLinkDto,
  ): Promise<{ success: boolean; message: string }> {
    const link = await this.linkRepository.findOne({
      where: [
        { guardianUserId: actorUserId, studentUserId: studentId, status: 'active' },
        { studentUserId: actorUserId, guardianUserId: studentId, status: 'active' },
      ],
    });

    if (!link) {
      throw new NotFoundException('Active guardian link not found');
    }

    link.status = 'revoked';
    link.updatedAt = new Date();
    await this.linkRepository.save(link);

    await this.auditService.record({
      actorUserId,
      action: 'guardian.child.link_revoked',
      resourceType: 'guardian_student_link',
      resourceId: link.id,
      reason: dto?.reason,
      safeMetadata: {
        revokedStudentId: studentId,
        guardianUserId: link.guardianUserId,
      },
    });

    return {
      success: true,
      message: 'Guardian-student relationship successfully revoked.',
    };
  }
}
