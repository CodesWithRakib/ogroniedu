import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserRoleEntity } from '../auth/entities/user-role.entity';
import { StudentProfileEntity } from '../users/entities/student-profile.entity';
import { GuardianStudentLinkEntity } from './entities/guardian-student-link.entity';
import { AuditService } from '../audit/audit.service';
import {
  LinkChildRequestDto,
  RegisterChildDto,
  VerifyLinkDto,
  RevokeLinkDto,
  SetChildPinDto,
} from './dto';
import { assertGuardianConsent } from './utils/guardian-consent.util';
import { APPROVED_CONSENT_POLICY } from './constants/guardian-policy.constants';
import { GuardianProvisioningService } from './services/guardian-provisioning.service';
import { isMinor as isMinorAge } from '../../common/utils/age.util';
import type { LinkedChildSummary } from './interfaces/linked-child-summary.interface';

export type { LinkedChildSummary } from './interfaces/linked-child-summary.interface';

@Injectable()
export class GuardiansService {
  private readonly logger = new Logger(GuardiansService.name);
  static readonly APPROVED_CONSENT_POLICY = APPROVED_CONSENT_POLICY;

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
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(GuardianProvisioningService)
    private readonly provisioning: GuardianProvisioningService,
  ) {}

  private isMinor(dateOfBirth: string | null | undefined): boolean {
    return isMinorAge(dateOfBirth);
  }

  async linkChildRequest(
    guardianUserId: string,
    dto: LinkChildRequestDto,
  ): Promise<GuardianStudentLinkEntity> {
    assertGuardianConsent(dto, GuardiansService.APPROVED_CONSENT_POLICY);

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
    return this.provisioning.registerChild(guardianUserId, dto);
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
        studentCode: profile?.studentCode ?? null,
        relationshipType: link.relationshipType,
        status: link.status,
        consentPolicyVersion: link.consentPolicyVersion,
        consentRecordedAt: link.consentRecordedAt,
        isMinor: this.isMinor(profile?.dateOfBirth),
        studentProfile: profile
          ? {
              studentCode: profile.studentCode ?? null,
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

  async getStudentGuardians(studentUserId: string): Promise<
    Array<{
      linkId: string;
      guardianId: string;
      displayName: string;
      email: string | null;
      phoneE164: string | null;
      relationshipType: string;
      status: 'pending' | 'active' | 'rejected' | 'revoked';
      consentPolicyVersion: string | null;
      consentRecordedAt: Date | null;
    }>
  > {
    const links = await this.linkRepository.find({
      where: { studentUserId },
      order: { createdAt: 'DESC' },
    });

    const results = [];
    for (const link of links) {
      const guardian = await this.userRepository.findOne({
        where: { id: link.guardianUserId },
      });
      if (!guardian) continue;

      results.push({
        linkId: link.id,
        guardianId: guardian.id,
        displayName: guardian.displayName,
        email: guardian.email,
        phoneE164: guardian.phoneE164,
        relationshipType: link.relationshipType,
        status: link.status,
        consentPolicyVersion: link.consentPolicyVersion,
        consentRecordedAt: link.consentRecordedAt,
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
      studentCode: profile?.studentCode ?? null,
      relationshipType: link.relationshipType,
      status: link.status,
      consentPolicyVersion: link.consentPolicyVersion,
      consentRecordedAt: link.consentRecordedAt,
      isMinor: this.isMinor(profile?.dateOfBirth),
      institutionName: profile?.institutionName ?? null,
      educationLevelName: null,
      studentProfile: profile
        ? {
            studentCode: profile.studentCode ?? null,
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

    // Safeguarding Invariant (ISSUE-02): Prohibit unlinking minor/student with active bookings
    const targetStudentId = link.studentUserId;
    const activeBookings = await this.dataSource.query(
      `SELECT count(*)::int as count FROM bookings WHERE student_user_id = $1 AND status IN ('awaiting_payment', 'confirmed', 'in_progress', 'dispute')`,
      [targetStudentId],
    );

    const activeCount = Number(activeBookings?.[0]?.count ?? 0);
    if (activeCount > 0) {
      throw new ConflictException(
        `Cannot revoke guardian relationship while the student has ${activeCount} active tutoring booking(s) in progress, awaiting payment, or in dispute. Please complete or cancel active bookings first.`,
      );
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

  /**
   * Issue a secure, 1-click magic login link for a linked child/student.
   * Guardian can send this link to the child's device (tablet/browser)
   * so the child immediately enters /dashboard/student without typing a password.
   */
  async generateChildMagicLink(
    guardianUserId: string,
    studentId: string,
    origin?: string,
  ): Promise<{
    magicLinkUrl: string;
    token: string;
    expiresInSeconds: number;
    studentName: string;
    studentCode: string | null;
  }> {
    const link = await this.linkRepository.findOne({
      where: { guardianUserId, studentUserId: studentId, status: 'active' },
    });
    if (!link) {
      throw new ForbiddenException(
        'Access denied: You do not have an active guardian relationship with this student.',
      );
    }

    const studentUser = await this.userRepository.findOne({ where: { id: studentId } });
    if (!studentUser) {
      throw new NotFoundException('Student user not found');
    }

    const profile = await this.studentProfileRepository.findOne({ where: { userId: studentId } });

    // Generate 32-byte cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour validity

    // Invalidate prior unused links for this student
    await this.dataSource.query(
      `UPDATE auth_magic_links
       SET consumed_at = now()
       WHERE user_id = $1 AND consumed_at IS NULL;`,
      [studentId],
    );

    const email = studentUser.email || `child.${studentUser.id.substring(0, 8)}@ogroniedu.internal`;
    await this.dataSource.query(
      `INSERT INTO auth_magic_links (user_id, email, token_hash, purpose, redirect_path, expires_at)
       VALUES ($1, $2, $3, 'login', '/dashboard/student', $4);`,
      [studentId, email, tokenHash, expiresAt],
    );

    await this.auditService.record({
      actorUserId: guardianUserId,
      action: 'guardian.child.magic_link_generated',
      resourceType: 'user',
      resourceId: studentId,
      safeMetadata: {
        studentName: studentUser.displayName,
        studentCode: profile?.studentCode ?? null,
      },
    });

    const baseUrl = origin ? origin.replace(/\/$/, '') : (process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5000');
    const magicLinkUrl = `${baseUrl}/en/magic-link?token=${token}&redirect=/dashboard/student`;

    return {
      magicLinkUrl,
      token,
      expiresInSeconds: 86400,
      studentName: studentUser.displayName,
      studentCode: profile?.studentCode ?? null,
    };
  }

  /**
   * Set or update a 4-8 digit PIN or password for the child student.
   * Enables the child to log in directly via /login using Student Code + PIN.
   */
  async setChildPin(
    guardianUserId: string,
    studentId: string,
    dto: SetChildPinDto,
  ): Promise<{ success: boolean; message: string; studentCode: string | null }> {
    const link = await this.linkRepository.findOne({
      where: { guardianUserId, studentUserId: studentId, status: 'active' },
    });
    if (!link) {
      throw new ForbiddenException(
        'Access denied: You do not have an active guardian relationship with this student.',
      );
    }

    const studentUser = await this.userRepository.findOne({ where: { id: studentId } });
    if (!studentUser) {
      throw new NotFoundException('Student user not found');
    }

    const passwordHash = await bcrypt.hash(dto.pin, 10);
    await this.dataSource.query(
      `UPDATE users
       SET password_hash = $1, auth_epoch = COALESCE(auth_epoch, 0) + 1, updated_at = now()
       WHERE id = $2;`,
      [passwordHash, studentId],
    );

    const profile = await this.studentProfileRepository.findOne({ where: { userId: studentId } });

    await this.auditService.record({
      actorUserId: guardianUserId,
      action: 'guardian.child.pin_updated',
      resourceType: 'user',
      resourceId: studentId,
      safeMetadata: {
        studentName: studentUser.displayName,
        studentCode: profile?.studentCode ?? null,
      },
    });

    return {
      success: true,
      message: 'Child PIN/Password updated successfully.',
      studentCode: profile?.studentCode ?? null,
    };
  }
}
