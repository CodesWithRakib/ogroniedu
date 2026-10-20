import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/api-response/api-response';
import { LearningAttendanceService } from './services/attendance.service';
import { LearningProgressService } from './services/progress.service';
import { AttendanceSummaryQueryDto, StudentScopedListQueryDto } from './dto';

@Controller('api/v1/learning')
export class LearningReportsController {
  constructor(
    @Inject(LearningAttendanceService)
    private readonly attendance: LearningAttendanceService,
    @Inject(LearningProgressService)
    private readonly progress: LearningProgressService,
  ) {}

  @Get('attendance/summary')
  @UseGuards(AuthGuard)
  async getAttendanceSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AttendanceSummaryQueryDto,
  ) {
    const summary = await this.attendance.getAttendanceSummary(user, query);
    return { success: true, data: summary };
  }

  @Get('students/:studentUserId/attendance')
  @UseGuards(AuthGuard)
  async getStudentAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentUserId', ParseUUIDPipe) studentUserId: string,
    @Query() query: StudentScopedListQueryDto,
  ) {
    const result = await this.attendance.getStudentAttendanceHistory(user, studentUserId, query);
    return paginated(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Get('students/:studentUserId/progress')
  @UseGuards(AuthGuard)
  async getStudentProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentUserId', ParseUUIDPipe) studentUserId: string,
    @Query() query: AttendanceSummaryQueryDto,
  ) {
    const progress = await this.progress.getStudentProgress(user, studentUserId, query);
    return { success: true, data: progress };
  }
}
