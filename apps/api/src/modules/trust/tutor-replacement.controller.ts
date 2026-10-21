import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TutorReplacementService } from './tutor-replacement.service';
import { paginated } from '../../common/api-response/api-response';
import {
  CreateReplacementCaseDto,
  ExtendReplacementDeadlineDto,
  ReplacementCaseQueryDto,
  UpdateReplacementCaseDto,
} from './dto';

@ApiTags('Trust & Tutor Replacement Guarantee')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/tutor-replacements')
export class TutorReplacementController {
  constructor(
    @Inject(TutorReplacementService)
    private readonly replacementService: TutorReplacementService,
  ) {}

  // --------------------------------------------------------------------------
  // Participant
  // --------------------------------------------------------------------------

  @Post()
  @ApiOperation({ summary: 'Submit a tutor replacement guarantee request' })
  @ApiResponse({ status: 201, description: 'Replacement request created' })
  async requestReplacement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReplacementCaseDto,
  ) {
    return { success: true, data: await this.replacementService.requestReplacement(user, dto) };
  }

  @Get('eligible-bookings')
  @ApiOperation({ summary: 'Bookings the caller can currently request a replacement for' })
  async listEligibleBookings(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.replacementService.listEligibleBookings(user) };
  }

  @Get()
  @ApiOperation({ summary: 'List replacement cases (staff queue or participant history)' })
  async listCases(@CurrentUser() user: AuthenticatedUser, @Query() query: ReplacementCaseQueryDto) {
    const res = await this.replacementService.listCases(user, query);
    return paginated(res.data, {
      page: res.page,
      pageSize: res.pageSize,
      totalItems: res.total,
    });
  }

  @Get(':id/candidates')
  @ApiOperation({ summary: 'Verified alternative tutors matching the booking subject/level' })
  async listCandidates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) caseId: string,
  ) {
    return this.replacementService.listCandidates(user, caseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get replacement case details and history (ABAC scoped)' })
  async getCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) caseId: string,
  ) {
    return { success: true, data: await this.replacementService.getCase(user, caseId) };
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an offered replacement tutor (participant consent)' })
  async acceptOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) caseId: string,
  ) {
    return { success: true, data: await this.replacementService.acceptOffer(user, caseId) };
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an offered replacement tutor' })
  async declineOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) caseId: string,
  ) {
    return { success: true, data: await this.replacementService.declineOffer(user, caseId) };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an open replacement request' })
  async cancelCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) caseId: string,
  ) {
    return { success: true, data: await this.replacementService.cancelCase(user, caseId) };
  }

  // --------------------------------------------------------------------------
  // Staff
  // --------------------------------------------------------------------------

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Update replacement case status/assignment (staff only)' })
  async updateCaseStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) caseId: string,
    @Body() dto: UpdateReplacementCaseDto,
  ) {
    return {
      success: true,
      data: await this.replacementService.updateCaseStatus(user, caseId, dto),
    };
  }

  @Patch(':id/deadline')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Extend a replacement matching deadline (staff only)' })
  async extendDeadline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) caseId: string,
    @Body() dto: ExtendReplacementDeadlineDto,
  ) {
    return { success: true, data: await this.replacementService.extendDeadline(user, caseId, dto) };
  }

  @Post('ops/sweep-overdue')
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run the idempotent overdue escalation sweep' })
  async sweepOverdue() {
    return { success: true, data: await this.replacementService.runOverdueSweep() };
  }
}
