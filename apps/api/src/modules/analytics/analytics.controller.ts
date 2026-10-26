import { Controller, Get, Post, Body, Param, Query, UseGuards, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTutorService } from './services/analytics-tutor.service';
import { EventTrackingService } from './services/event-tracking.service';
import { AnalyticsTimeQueryDto, ExportReportDto, TrackEventDto } from './dto';

@Controller('api/v1/analytics')
@UseGuards(AuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
    @Inject(AnalyticsTutorService)
    private readonly tutorAnalytics: AnalyticsTutorService,
    @Inject(EventTrackingService)
    private readonly eventTrackingService: EventTrackingService,
  ) {}

  /**
   * 0. Ingest Privacy-Sanitized Client Event (Rate-Limited, Validated Schema)
   */
  @Post('events')
  @Public()
  async trackEvent(@Body() dto: TrackEventDto, @CurrentUser() user?: AuthenticatedUser) {
    const data = await this.eventTrackingService.trackClientEvent(dto, user);
    return {
      success: true,
      data,
    };
  }

  /**
   * 1. Operational Overview KPI Analytics (Admin / Super-Admin Only)
   */
  @Get('overview')
  @Roles(...ADMIN_ROLES)
  async getOperationalOverview(@Query() query: AnalyticsTimeQueryDto) {
    const data = await this.analyticsService.getOperationalOverview(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 1b. Multi-Stage Booking & Discovery Funnel Analytics (Admin / Super-Admin Only)
   */
  @Get('funnel')
  @Roles(...ADMIN_ROLES)
  async getFunnelAnalytics(@Query() query: AnalyticsTimeQueryDto) {
    const data = await this.analyticsService.getFunnelAnalytics(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 1c. Role-Specific User Activation Analytics (Admin / Super-Admin Only)
   */
  @Get('activation')
  @Roles(...ADMIN_ROLES)
  async getActivationAnalytics(@Query() query: AnalyticsTimeQueryDto) {
    const data = await this.analyticsService.getActivationAnalytics(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 1d. Learning Engagement & Homework Completion Analytics (Admin / Super-Admin Only)
   */
  @Get('learning')
  @Roles(...ADMIN_ROLES)
  async getLearningEngagementAnalytics(@Query() query: AnalyticsTimeQueryDto) {
    const data = await this.analyticsService.getLearningEngagementAnalytics(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 2. Financial & Double-Entry Ledger Analytics (Admin / Super-Admin Only)
   */
  @Get('financials')
  @Roles(...ADMIN_ROLES)
  async getFinancialAnalytics(@Query() query: AnalyticsTimeQueryDto) {
    const data = await this.analyticsService.getFinancialAnalytics(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 3. Tutor Performance Leaderboard & Response Times (Admin / Super-Admin Only)
   */
  @Get('tutors')
  @Roles(...ADMIN_ROLES)
  async getTutorPerformanceAnalytics(@Query() query: AnalyticsTimeQueryDto) {
    const data = await this.tutorAnalytics.getTutorPerformanceAnalytics(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 4. Learner Cohort Retention & Re-Booking Rates (Admin / Super-Admin Only)
   */
  @Get('retention')
  @Roles(...ADMIN_ROLES)
  async getRetentionAnalytics(@Query() query: AnalyticsTimeQueryDto) {
    const data = await this.analyticsService.getRetentionAnalytics(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 5. Personal Tutor Performance Analytics (ABAC Scoped strictly to logged-in tutor)
   */
  @Get('tutors/me')
  @Roles('tutor')
  async getMyTutorAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsTimeQueryDto,
  ) {
    const data = await this.tutorAnalytics.getMyTutorAnalytics(user.id, query);
    return {
      success: true,
      data,
    };
  }

  /**
   * 6. Tenant-Isolated Organization Scoped Analytics
   */
  @Get('organizations/:id')
  async getOrganizationAnalytics(
    @Param('id') orgId: string,
    @Query() query: AnalyticsTimeQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.analyticsService.getOrganizationAnalytics(orgId, query, user);
    return {
      success: true,
      data,
    };
  }

  /**
   * 7. Administrative CSV Report Export with Anti-Formula Injection
   */
  @Get('reports/export')
  @Roles(...ADMIN_ROLES)
  async exportReport(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Query() dto: ExportReportDto,
    @Res() res: Response,
  ) {
    const { csv, filename } = await this.analyticsService.exportReport(adminUser, dto);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  }
}
