import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SchedulingService } from './scheduling.service';
import {
  CreateSessionDto,
  CreateRecurringSessionsDto,
  RescheduleSessionDto,
  CancelSessionDto,
  GetSessionsQueryDto,
} from './dto';

@Controller('api/v1')
export class SessionsController {
  constructor(
    @Inject(SchedulingService)
    private readonly schedulingService: SchedulingService,
  ) {}

  @Post('sessions')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async scheduleSession(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSessionDto) {
    const session = await this.schedulingService.scheduleSession(user, dto);
    return {
      success: true,
      message: 'Tutoring session scheduled successfully.',
      data: session,
    };
  }

  @Post('sessions/recurring')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async scheduleRecurringSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecurringSessionsDto,
  ) {
    const sessions = await this.schedulingService.scheduleRecurringSessions(user, dto);
    return {
      success: true,
      message: `Successfully scheduled ${sessions.length} recurring tutoring sessions.`,
      data: sessions,
    };
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  async getSessions(@CurrentUser() user: AuthenticatedUser, @Query() query: GetSessionsQueryDto) {
    const sessions = await this.schedulingService.getSessions(user, query);
    return {
      success: true,
      data: sessions,
    };
  }

  @Get('sessions/:id')
  @UseGuards(AuthGuard)
  async getSessionById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const session = await this.schedulingService.getSessionById(id, user);
    return {
      success: true,
      data: session,
    };
  }

  @Post('sessions/:id/reschedule')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async rescheduleSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleSessionDto,
  ) {
    const session = await this.schedulingService.rescheduleSession(id, user, dto);
    return {
      success: true,
      message: 'Tutoring session rescheduled successfully.',
      data: session,
    };
  }

  @Post('sessions/:id/cancel')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSessionDto,
  ) {
    const result = await this.schedulingService.cancelSession(id, user, dto);
    return {
      success: true,
      message: 'Tutoring session cancelled.',
      data: result.session,
      assessment: result.policyAssessment,
    };
  }

  @Get('tutors/:tutorId/calendar')
  async getTutorCalendar(
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 14 * 24 * 3600 * 1000); // Default next 14 days

    const slots = await this.schedulingService.getTutorCalendar(tutorId, fromDate, toDate);
    return {
      success: true,
      data: slots,
    };
  }
}
