import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { LearningService } from './learning.service';
import {
  MarkAttendanceDto,
  CreateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  CreateProgressReportDto,
} from './dto';

@Controller('api/v1/learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Post('attendance')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async markAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkAttendanceDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const record = await this.learningService.markAttendance(user, dto, requestId);
    return {
      success: true,
      message: 'Attendance recorded successfully.',
      data: record,
    };
  }

  @Get('sessions/:sessionId/attendance')
  @UseGuards(AuthGuard)
  async getSessionAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const attendance = await this.learningService.getSessionAttendance(user, sessionId);
    return {
      success: true,
      data: attendance,
    };
  }

  @Post('assignments')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssignmentDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const assignment = await this.learningService.createAssignment(user, dto, requestId);
    return {
      success: true,
      message: 'Assignment created successfully.',
      data: assignment,
    };
  }

  @Post('assignments/:assignmentId/submissions')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const submission = await this.learningService.submitAssignment(
      user,
      assignmentId,
      dto,
      requestId,
    );
    return {
      success: true,
      message: 'Assignment submitted successfully.',
      data: submission,
    };
  }

  @Post('submissions/:submissionId/grade')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async gradeSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const graded = await this.learningService.gradeSubmission(user, submissionId, dto, requestId);
    return {
      success: true,
      message: 'Assignment submission graded successfully.',
      data: graded,
    };
  }

  @Post('progress-reports')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async generateProgressReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProgressReportDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const report = await this.learningService.generateProgressReport(user, dto, requestId);
    return {
      success: true,
      message: 'Progress report generated successfully.',
      data: report,
    };
  }

  @Get('bookings/:bookingId')
  @UseGuards(AuthGuard)
  async getBookingLearningRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    const records = await this.learningService.getBookingLearningRecords(user, bookingId);
    return {
      success: true,
      data: records,
    };
  }

  @Get('students/:studentUserId/summary')
  @UseGuards(AuthGuard)
  async getStudentLearningSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentUserId', ParseUUIDPipe) studentUserId: string,
  ) {
    const summary = await this.learningService.getStudentLearningSummary(user, studentUserId);
    return {
      success: true,
      data: summary,
    };
  }
}
