import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SafetyReportsService } from './safety-reports.service';
import { CreateSafetyReportDto, UpdateSafetyReportDto } from './dto';

@ApiTags('Trust & Safety Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/safety-reports')
export class SafetyReportsController {
  constructor(private readonly safetyService: SafetyReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit safety, abuse, or child protection report' })
  @ApiResponse({ status: 201, description: 'Safety report registered and evaluated' })
  async createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSafetyReportDto,
  ) {
    return this.safetyService.createReport(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List safety reports (Admin queue or reporter own history)' })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async listReports(@CurrentUser() user: AuthenticatedUser) {
    return this.safetyService.listReports(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a safety report (ABAC Scoped)' })
  @ApiResponse({ status: 200, description: 'Report details' })
  async getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
  ) {
    return this.safetyService.getReport(user, reportId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update report investigation status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Report status updated' })
  async updateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reportId: string,
    @Body() dto: UpdateSafetyReportDto,
  ) {
    return this.safetyService.updateReport(user, reportId, dto);
  }
}
