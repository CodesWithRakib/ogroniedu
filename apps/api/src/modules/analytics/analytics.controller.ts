import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTutorService } from './services/analytics-tutor.service';
import { AnalyticsTimeQueryDto } from './dto';

@Controller('api/v1/analytics')
@UseGuards(AuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService)
    private readonly analyticsService: AnalyticsService,
    @Inject(AnalyticsTutorService)
    private readonly tutorAnalytics: AnalyticsTutorService,
  ) {}

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
}
