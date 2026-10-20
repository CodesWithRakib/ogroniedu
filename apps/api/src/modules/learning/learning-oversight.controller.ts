import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/api-response/api-response';
import { LearningOversightService } from './services/learning-oversight.service';
import { AdminSessionsQueryDto, AdminOverviewQueryDto } from './dto';

@Controller('api/v1/learning/admin')
@UseGuards(AuthGuard)
export class LearningOversightController {
  constructor(
    @Inject(LearningOversightService)
    private readonly oversight: LearningOversightService,
  ) {}

  @Get('sessions')
  async listSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminSessionsQueryDto,
  ) {
    const result = await this.oversight.listSessions(user, query);
    return paginated(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Get('overview')
  async getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminOverviewQueryDto,
  ) {
    const overview = await this.oversight.getOverview(user, query);
    return { success: true, data: overview };
  }
}
