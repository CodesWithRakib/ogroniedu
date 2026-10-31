import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES, TUTOR_REVIEW_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { buildOffsetMeta } from '../../common/api-response/api-response';
import { AuditService } from '../audit/audit.service';
import { TutorsService } from './tutors.service';
import { TutorVerificationLevelPipe } from './pipes/verification-level.pipe';
import {
  AdminReviewTutorDto,
  AdminVerifyQualificationDto,
  AdminUpdateTutorProfileDto,
  AssignVerificationLevelDto,
  ReviewerDecisionDto,
  VerificationQueueQueryDto,
  VerifyVerificationDocumentDto,
} from './dto';
import type { TutorVerificationLevel } from '@ogroniedu/contracts';

@Controller('api/v1/admin/tutors')
@UseGuards(AuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
export class AdminTutorsController {
  constructor(
    @Inject(TutorsService)
    private readonly tutorsService: TutorsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  /**
   * Complete directory of all tutors with search & filter capability
   */
  @Get()
  @Roles(...ADMIN_ROLES)
  async listAllTutors(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('verificationStatus') verificationStatus?: string,
    @Query('gender') gender?: string,
    @Query('district') district?: string,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const page = Math.max(1, parseInt(pageRaw || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitRaw || '10', 10) || 10));
    const offset = (page - 1) * limit;

    let whereClause = `WHERE u.deleted_at IS NULL`;
    const filterParams: any[] = [];
    let pIdx = 1;

    if (search) {
      whereClause += ` AND (u.display_name ILIKE $${pIdx} OR u.email ILIKE $${pIdx} OR tp.headline ILIKE $${pIdx})`;
      filterParams.push(`%${search.trim()}%`);
      pIdx++;
    }
    if (status) {
      whereClause += ` AND u.status = $${pIdx}`;
      filterParams.push(status);
      pIdx++;
    }
    if (verificationStatus) {
      whereClause += ` AND tp.verification_status = $${pIdx}`;
      filterParams.push(verificationStatus);
      pIdx++;
    }
    if (gender) {
      whereClause += ` AND tp.gender = $${pIdx}`;
      filterParams.push(gender);
      pIdx++;
    }
    if (district) {
      whereClause += ` AND tp.district ILIKE $${pIdx}`;
      filterParams.push(`%${district.trim()}%`);
      pIdx++;
    }

    const countSql = `
      SELECT count(DISTINCT u.id)::int as total
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
      JOIN roles r ON ur.role_id = r.id AND r.code = 'tutor'
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
      ${whereClause}
    `;
    const countRes = await this.dataSource.query(countSql, filterParams);
    const total = countRes[0]?.total || 0;

    const dataSql = `
      SELECT u.id, u.display_name, u.email, u.phone_e164, u.status as user_status, u.created_at,
             tp.headline, tp.bio, tp.gender, tp.district, tp.hourly_rate_minor, tp.currency,
             tp.years_experience, tp.verification_status, tp.publication_status,
             COALESCE(
               json_agg(DISTINCT jsonb_build_object('id', s.id, 'name_en', s.name_en, 'name_bn', s.name_bn, 'code', s.code))
               FILTER (WHERE s.id IS NOT NULL),
               '[]'
             ) as subjects
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
      JOIN roles r ON ur.role_id = r.id AND r.code = 'tutor'
      LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
      LEFT JOIN tutor_subjects ts ON ts.tutor_user_id = u.id
      LEFT JOIN subjects s ON ts.subject_id = s.id
      ${whereClause}
      GROUP BY u.id, tp.user_id
      ORDER BY u.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1};
    `;

    const dataParams = [...filterParams, limit, offset];
    const rows = await this.dataSource.query(dataSql, dataParams);

    return {
      success: true,
      data: rows,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    };
  }

  /**
   * Full profile for admin inspection & editing
   */
  @Get(':tutorId/full-profile')
  @Roles(...ADMIN_ROLES)
  async getFullTutorProfile(@Param('tutorId', ParseUUIDPipe) tutorId: string) {
    const userRes = await this.dataSource.query(
      `SELECT u.id, u.display_name, u.email, u.phone_e164, u.status as user_status, u.created_at, u.last_login_at
       FROM users u WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [tutorId],
    );
    if (!userRes[0]) throw new NotFoundException('Tutor not found');

    const profileRes = await this.dataSource.query(
      `SELECT * FROM tutor_profiles WHERE user_id = $1`,
      [tutorId],
    );

    const qualifications = await this.dataSource.query(
      `SELECT * FROM tutor_qualifications WHERE tutor_user_id = $1 ORDER BY created_at DESC`,
      [tutorId],
    );

    const subjects = await this.dataSource.query(
      `SELECT ts.*, s.name_en, s.name_bn, s.code as subject_code
       FROM tutor_subjects ts
       JOIN subjects s ON ts.subject_id = s.id
       WHERE ts.tutor_user_id = $1`,
      [tutorId],
    );

    let levels = await this.dataSource.query(
      `SELECT * FROM tutor_verification_levels WHERE tutor_user_id = $1`,
      [tutorId],
    );

    if (levels.length === 0) {
      await this.dataSource.query(`
        INSERT INTO tutor_verification_levels (id, tutor_user_id, level, status, policy_version, submission_count, version)
        VALUES 
        (gen_random_uuid(), $1, 'identity', 'not_started', '2026-04-v1', 0, 1),
        (gen_random_uuid(), $1, 'educational', 'not_started', '2026-04-v1', 0, 1),
        (gen_random_uuid(), $1, 'institutional', 'not_started', '2026-04-v1', 0, 1)
        ON CONFLICT DO NOTHING;
      `, [tutorId]);
      levels = await this.dataSource.query(
        `SELECT * FROM tutor_verification_levels WHERE tutor_user_id = $1`,
        [tutorId],
      );
    }

    const documents = await this.dataSource.query(
      `SELECT d.*, fa.original_filename, fa.media_type, fa.size_bytes, fa.storage_key,
              u.display_name as reviewer_name
       FROM tutor_verification_documents d
       LEFT JOIN file_assets fa ON d.file_asset_id = fa.id
       LEFT JOIN users u ON d.reviewed_by_user_id = u.id
       WHERE d.tutor_user_id = $1 AND d.deleted_at IS NULL
       ORDER BY d.created_at DESC`,
      [tutorId],
    );

    const auditLogs = await this.dataSource.query(
      `SELECT al.*, u.display_name as actor_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       WHERE al.resource_id = $1
       ORDER BY al.created_at DESC LIMIT 20`,
      [tutorId],
    );

    return {
      success: true,
      data: {
        user: userRes[0],
        profile: profileRes[0] || null,
        qualifications,
        subjects,
        levels,
        documents,
        auditLogs,
      },
    };
  }

  /**
   * Direct admin profile edit with before/after audit tracking
   */
  @Patch(':tutorId/profile')
  @Roles(...ADMIN_ROLES)
  async adminUpdateTutorProfile(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Body() dto: AdminUpdateTutorProfileDto,
  ) {
    const userRes = await this.dataSource.query(`SELECT * FROM users WHERE id = $1`, [tutorId]);
    if (!userRes[0]) throw new NotFoundException('Tutor user not found');
    const currentUser = userRes[0];

    const profileRes = await this.dataSource.query(`SELECT * FROM tutor_profiles WHERE user_id = $1`, [tutorId]);
    const currentProfile = profileRes[0];

    const beforeState = {
      displayName: currentUser.display_name,
      phoneE164: currentUser.phone_e164,
      userStatus: currentUser.status,
      headline: currentProfile?.headline,
      bio: currentProfile?.bio,
      gender: currentProfile?.gender,
      district: currentProfile?.district,
      hourlyRateMinor: currentProfile?.hourly_rate_minor,
      yearsExperience: currentProfile?.years_experience,
      verificationStatus: currentProfile?.verification_status,
      publicationStatus: currentProfile?.publication_status,
      preferredAreas: currentProfile?.preferred_areas,
    };

    if (dto.displayName || dto.phoneE164 || dto.userStatus) {
      let userSql = 'UPDATE users SET updated_at = NOW()';
      const userParams: any[] = [];
      let uIdx = 1;
      if (dto.displayName !== undefined) {
        userSql += `, display_name = $${uIdx}, display_name_en = $${uIdx}, display_name_bn = $${uIdx}`;
        userParams.push(dto.displayName);
        uIdx++;
      }
      if (dto.phoneE164 !== undefined) {
        userSql += `, phone_e164 = $${uIdx}`;
        userParams.push(dto.phoneE164);
        uIdx++;
      }
      if (dto.userStatus !== undefined) {
        userSql += `, status = $${uIdx}`;
        userParams.push(dto.userStatus);
        uIdx++;
        if (dto.userStatus === 'suspended' || dto.userStatus === 'banned') {
          userSql += `, auth_epoch = COALESCE(auth_epoch, 0) + 1`;
        }
      }
      userSql += ` WHERE id = $${uIdx}`;
      userParams.push(tutorId);
      await this.dataSource.query(userSql, userParams);
    }

    if (currentProfile) {
      let pSql = 'UPDATE tutor_profiles SET updated_at = NOW()';
      const pParams: any[] = [];
      let pIdx = 1;
      if (dto.headline !== undefined) {
        pSql += `, headline = $${pIdx}, headline_en = $${pIdx}, headline_bn = $${pIdx}`;
        pParams.push(dto.headline);
        pIdx++;
      }
      if (dto.bio !== undefined) {
        pSql += `, bio = $${pIdx}, bio_en = $${pIdx}, bio_bn = $${pIdx}`;
        pParams.push(dto.bio);
        pIdx++;
      }
      if (dto.gender !== undefined) {
        pSql += `, gender = $${pIdx}`;
        pParams.push(dto.gender);
        pIdx++;
      }
      if (dto.district !== undefined) {
        pSql += `, district = $${pIdx}`;
        pParams.push(dto.district);
        pIdx++;
      }
      if (dto.hourlyRateMinor !== undefined) {
        pSql += `, hourly_rate_minor = $${pIdx}`;
        pParams.push(dto.hourlyRateMinor);
        pIdx++;
      }
      if (dto.yearsExperience !== undefined) {
        pSql += `, years_experience = $${pIdx}`;
        pParams.push(dto.yearsExperience);
        pIdx++;
      }
      if (dto.verificationStatus !== undefined) {
        pSql += `, verification_status = $${pIdx}`;
        pParams.push(dto.verificationStatus);
        pIdx++;
        if (dto.verificationStatus === 'approved') {
          pSql += `, verified_at = NOW()`;
        }
      }
      if (dto.publicationStatus !== undefined) {
        pSql += `, publication_status = $${pIdx}`;
        pParams.push(dto.publicationStatus);
        pIdx++;
      }
      if (dto.preferredAreas !== undefined) {
        pSql += `, preferred_areas = $${pIdx}`;
        pParams.push(dto.preferredAreas);
        pIdx++;
      }
      pSql += ` WHERE user_id = $${pIdx}`;
      pParams.push(tutorId);
      await this.dataSource.query(pSql, pParams);
    }

    await this.auditService.record({
      actorUserId: adminUser.id,
      action: 'admin.tutor_profile.updated',
      resourceType: 'tutor_profile',
      resourceId: tutorId,
      reason: 'Administrator updated tutor profile details',
      safeMetadata: {
        before: beforeState,
        after: dto,
      },
    });

    return {
      success: true,
      message: 'Tutor profile updated successfully and change log recorded.',
    };
  }

  /**
   * Tutor audit and change history log
   */
  @Get(':tutorId/audit-logs')
  @Roles(...ADMIN_ROLES)
  async getTutorAuditLogs(@Param('tutorId', ParseUUIDPipe) tutorId: string) {
    const logs = await this.dataSource.query(
      `SELECT al.*, u.display_name as actor_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_user_id = u.id
       WHERE al.resource_id = $1
       ORDER BY al.created_at DESC LIMIT 50`,
      [tutorId],
    );
    return { success: true, data: logs };
  }

  @Get('pending')
  async getPendingTutors() {
    const list = await this.tutorsService.getPendingVerificationTutors();
    return {
      success: true,
      data: list,
    };
  }


  // --------------------------------------------------------------------------
  // Verification queue & dossier review (Phase 02)
  // --------------------------------------------------------------------------

  /**
   * Paginated review queue, one row per level awaiting a decision. Open to
   * compliance reviewers too; assignment scoping is enforced server-side.
   */
  @Get('verification/queue')
  @Roles(...TUTOR_REVIEW_ROLES)
  async getVerificationQueue(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Query() query: VerificationQueueQueryDto,
  ) {
    const result = await this.tutorsService.getVerificationQueue(reviewer, query);
    return {
      success: true,
      data: result.data,
      meta: {
        pagination: buildOffsetMeta({
          page: result.page,
          pageSize: result.pageSize,
          totalItems: result.total,
        }),
      },
    };
  }

  /** On-demand run of the expiry/reminder sweep (ops + platform admins). */
  @Post('verification/sweep')
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  async runVerificationSweep() {
    const result = await this.tutorsService.runVerificationExpirySweep();
    return {
      success: true,
      data: result,
    };
  }

  @Get(':tutorId/review-dossier')
  @Roles(...TUTOR_REVIEW_ROLES)
  async getReviewDossier(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
  ) {
    const dossier = await this.tutorsService.getReviewDossier(tutorId, reviewer);
    return {
      success: true,
      data: dossier,
    };
  }

  /** Approve / reject / request information / suspend / reinstate one level. */
  @Post(':tutorId/verification/levels/:level/decision')
  @Roles(...TUTOR_REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  async decideVerificationLevel(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Param('level', TutorVerificationLevelPipe) level: TutorVerificationLevel,
    @Body() dto: ReviewerDecisionDto,
  ) {
    const result = await this.tutorsService.decideVerificationLevel(reviewer, tutorId, level, dto);
    return {
      success: true,
      message: `The ${level} verification level was marked as '${dto.decision}'.`,
      data: result,
    };
  }

  /** Claim an unassigned level, or (admins only) assign it to another reviewer. */
  @Post(':tutorId/verification/levels/:level/assign')
  @Roles(...TUTOR_REVIEW_ROLES)
  @HttpCode(HttpStatus.OK)
  async assignVerificationLevel(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Param('level', TutorVerificationLevelPipe) level: TutorVerificationLevel,
    @Body() dto: AssignVerificationLevelDto,
  ) {
    const assigned = await this.tutorsService.assignVerificationLevel(
      reviewer,
      tutorId,
      level,
      dto.reviewerUserId,
    );
    return {
      success: true,
      data: assigned,
    };
  }

  /** Approve or reject a single piece of evidence. */
  @Patch(':tutorId/verification/documents/:documentId/verify')
  @Roles(...TUTOR_REVIEW_ROLES)
  async verifyVerificationDocument(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: VerifyVerificationDocumentDto,
  ) {
    const document = await this.tutorsService.verifyVerificationDocument(
      reviewer,
      tutorId,
      documentId,
      dto,
    );
    return {
      success: true,
      message: `Verification document marked as '${dto.reviewStatus}'.`,
      data: document,
    };
  }

  /**
   * Signed, short-lived download for private dossier evidence. Authorization is
   * re-checked against level assignment before a URL is issued and the access is
   * written to the audit trail.
   */
  @Get(':tutorId/verification/documents/:documentId/access')
  @Roles(...TUTOR_REVIEW_ROLES)
  async getVerificationDocumentAccess(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    const access = await this.tutorsService.getVerificationDocumentAccess(
      reviewer,
      tutorId,
      documentId,
    );
    return {
      success: true,
      data: access,
    };
  }

  // --------------------------------------------------------------------------
  // Legacy profile-level review (pre-Phase-02 contract)
  // --------------------------------------------------------------------------

  @Post(':tutorId/review')
  @HttpCode(HttpStatus.OK)
  async submitReviewDecision(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Body() dto: AdminReviewTutorDto,
  ) {
    const review = await this.tutorsService.submitReviewDecision(reviewer, tutorId, dto);
    return {
      success: true,
      message: `Review decision '${dto.decision}' recorded successfully.`,
      data: review,
    };
  }

  @Patch(':tutorId/qualifications/:qualificationId/verify')
  async verifyQualification(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
    @Body() dto: AdminVerifyQualificationDto,
  ) {
    const qualification = await this.tutorsService.verifyQualification(
      reviewer,
      tutorId,
      qualificationId,
      dto.reviewStatus,
    );
    return {
      success: true,
      message: `Qualification marked as '${dto.reviewStatus}'.`,
      data: qualification,
    };
  }
}
