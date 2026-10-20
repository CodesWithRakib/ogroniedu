import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/api-response/api-response';
import { LearningService } from './learning.service';
import {
  MarkAttendanceDto,
  CreateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  CreateProgressReportDto,
  LearningListQueryDto,
} from './dto';

@Controller('api/v1/learning')
export class LearningController {
  constructor(
    @Inject(LearningService)
    private readonly learningService: LearningService,
  ) {}

  // ---------------------------------------------------------------------------
  // Attendance
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Homework
  // ---------------------------------------------------------------------------

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

  @Get('assignments')
  @UseGuards(AuthGuard)
  async listAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LearningListQueryDto,
  ) {
    const result = await this.learningService.listAssignments(user, query);
    return paginated(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Get('assignments/:assignmentId')
  @UseGuards(AuthGuard)
  async getAssignmentById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    const assignment = await this.learningService.getAssignmentById(user, assignmentId);
    return { success: true, data: assignment };
  }

  @Post('assignments/:assignmentId/publish')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async publishAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const assignment = await this.learningService.publishAssignment(user, assignmentId, requestId);
    return { success: true, message: 'Assignment published.', data: assignment };
  }

  @Post('assignments/:assignmentId/archive')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async archiveAssignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const assignment = await this.learningService.archiveAssignment(user, assignmentId, requestId);
    return { success: true, message: 'Assignment archived.', data: assignment };
  }

  @Get('assignments/:assignmentId/submissions')
  @UseGuards(AuthGuard)
  async listSubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    const submissions = await this.learningService.listSubmissions(user, assignmentId);
    return { success: true, data: submissions };
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

  @Get('submissions/:submissionId')
  @UseGuards(AuthGuard)
  async getSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    const submission = await this.learningService.getSubmissionById(user, submissionId);
    return { success: true, data: submission };
  }

  @Get('submissions/:submissionId/revisions')
  @UseGuards(AuthGuard)
  async getSubmissionRevisions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    const revisions = await this.learningService.listSubmissionRevisions(user, submissionId);
    return { success: true, data: revisions };
  }

  @Post('submissions/:submissionId/review')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async reviewSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const graded = await this.learningService.gradeSubmission(user, submissionId, dto, requestId);
    return {
      success: true,
      message: 'Assignment submission reviewed successfully.',
      data: graded,
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

  @Post('submissions/:submissionId/return')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async returnSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: ReturnSubmissionDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const submission = await this.learningService.returnSubmission(
      user,
      submissionId,
      dto,
      requestId,
    );
    return { success: true, message: 'Submission returned for revision.', data: submission };
  }

  // ---------------------------------------------------------------------------
  // Progress reports & legacy views
  // ---------------------------------------------------------------------------

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

  @Get('progress-reports/:reportId')
  @UseGuards(AuthGuard)
  async getProgressReportById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ) {
    const report = await this.learningService.getProgressReportById(user, reportId);
    return { success: true, data: report };
  }

  @Get('bookings/:bookingId')
  @UseGuards(AuthGuard)
  async getBookingLearningRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    const records = await this.learningService.getBookingLearningRecords(user, bookingId);
    return { success: true, data: records };
  }

  @Get('students/:studentUserId/summary')
  @UseGuards(AuthGuard)
  async getStudentLearningSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentUserId', ParseUUIDPipe) studentUserId: string,
  ) {
    const summary = await this.learningService.getStudentLearningSummary(user, studentUserId);
    return { success: true, data: summary };
  }
}
