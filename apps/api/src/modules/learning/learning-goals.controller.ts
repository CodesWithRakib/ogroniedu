import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/api-response/api-response';
import { LearningGoalsService } from './services/learning-goals.service';
import { CreateLearningGoalDto, UpdateLearningGoalDto, StudentScopedListQueryDto } from './dto';

@Controller('api/v1/learning/goals')
export class LearningGoalsController {
  constructor(
    @Inject(LearningGoalsService)
    private readonly goals: LearningGoalsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLearningGoalDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const goal = await this.goals.createGoal(user, dto, requestId);
    return { success: true, message: 'Learning goal created.', data: goal };
  }

  @Get()
  @UseGuards(AuthGuard)
  async listGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StudentScopedListQueryDto,
  ) {
    const result = await this.goals.listGoals(user, query);
    return paginated(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateGoal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningGoalDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const goal = await this.goals.updateGoal(user, id, dto, requestId);
    return { success: true, message: 'Learning goal updated.', data: goal };
  }
}
