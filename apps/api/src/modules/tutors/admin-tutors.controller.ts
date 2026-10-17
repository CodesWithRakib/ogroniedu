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
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES, TUTOR_REVIEW_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { buildOffsetMeta } from '../../common/api-response/api-response';
import { TutorsService } from './tutors.service';
import { TutorVerificationLevelPipe } from './pipes/verification-level.pipe';
import {
  AdminReviewTutorDto,
  AdminVerifyQualificationDto,
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
  ) {}

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
