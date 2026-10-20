import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SafetyReportsService } from './safety-reports.service';
import {
  CreateSafetyReportDto,
  UpdateSafetyReportDto,
  AssignCaseDto,
  CreateCaseMessageDto,
  ApplySafetyActionDto,
  RevokeSafetyActionDto,
  ResolveSafetyCaseDto,
  UpdateCaseStatusDto,
} from './dto';
import type { SafetyCategory, SafetyStatus } from './entities/safety-report.entity';

@ApiTags('Trust & Safety Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/safety-reports')
export class SafetyReportsController {
  constructor(
    @Inject(SafetyReportsService)
    private readonly safetyService: SafetyReportsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit safety, abuse, or child protection report' })
  @ApiResponse({ status: 201, description: 'Safety report registered and evaluated' })
  async createReport(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSafetyReportDto) {
    return this.safetyService.createReport(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List safety reports (Staff queue or reporter own history)' })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async listReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: SafetyStatus,
    @Query('category') category?: SafetyCategory,
  ) {
    return this.safetyService.listReports(user, { status, category });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a safety report (ABAC Scoped)' })
  @ApiResponse({ status: 200, description: 'Report details' })
  async getReport(@CurrentUser() user: AuthenticatedUser, @Param('id') reportId: string) {
    return this.safetyService.getReport(user, reportId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update case lifecycle status (with durable event commit)' })
  @ApiResponse({ status: 200, description: 'Case status updated' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body() dto: UpdateCaseStatusDto,
  ) {
    return this.safetyService.updateCaseStatus(user, reportId, dto);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign case investigator (with conflict of interest checks)' })
  @ApiResponse({ status: 200, description: 'Case assigned' })
  async assignCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body() dto: AssignCaseDto,
  ) {
    return this.safetyService.assignCase(user, reportId, dto);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Post case message or internal investigator note' })
  @ApiResponse({ status: 201, description: 'Message saved' })
  async addMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body() dto: CreateCaseMessageDto,
  ) {
    return this.safetyService.addCaseMessage(user, reportId, dto);
  }

  @Post(':id/actions')
  @ApiOperation({ summary: 'Apply immediate protective safety action (hold, restriction, suspension)' })
  @ApiResponse({ status: 201, description: 'Safety action applied' })
  async applyAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body() dto: ApplySafetyActionDto,
  ) {
    return this.safetyService.applySafetyAction(user, reportId, dto);
  }

  @Post('actions/:actionId/revoke')
  @ApiOperation({ summary: 'Revoke an existing safety action' })
  @ApiResponse({ status: 200, description: 'Safety action revoked' })
  async revokeAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionId') actionId: string,
    @Body() dto: RevokeSafetyActionDto,
  ) {
    return this.safetyService.revokeSafetyAction(user, actionId, dto);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve case with documented findings' })
  @ApiResponse({ status: 200, description: 'Case resolved' })
  async resolveCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body() dto: ResolveSafetyCaseDto,
  ) {
    return this.safetyService.resolveCase(user, reportId, dto);
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen a previously resolved or closed case' })
  @ApiResponse({ status: 200, description: 'Case reopened' })
  async reopenCase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body('reason') reason: string,
  ) {
    return this.safetyService.reopenCase(user, reportId, reason || 'Reopened for investigation review');
  }

  @Get(':id/evidence/:assetId')
  @ApiOperation({ summary: 'Access-controlled signed download for case evidence' })
  @ApiResponse({ status: 200, description: 'Signed asset access token' })
  async getEvidenceAccess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.safetyService.getEvidenceAccess(user, reportId, assetId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Legacy update report endpoint' })
  async updateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body() dto: UpdateSafetyReportDto,
  ) {
    return this.safetyService.updateReport(user, reportId, dto);
  }

  @Post(':id/protective-hold')
  @ApiOperation({ summary: 'Legacy apply protective hold on reported tutor' })
  async applyProtectiveHold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body('reason') reason: string,
  ) {
    return this.safetyService.applyProtectiveHold(user, reportId, reason || 'Protective hold pending investigation');
  }

  @Patch(':id/protective-hold/release')
  @ApiOperation({ summary: 'Legacy release protective safety hold on tutor' })
  async removeProtectiveHold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
  ) {
    return this.safetyService.removeProtectiveHold(user, reportId);
  }
}
