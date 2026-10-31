import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TuitionRequestsService } from './tuition-requests.service';
import {
  CreateTuitionRequestDto,
  ApplyTuitionRequestDto,
  SuggestTutorsDto,
  RespondSuggestionDto,
  GetTuitionRequestsQueryDto,
} from './dto';

@Controller('api/v1/tuition-requests')
export class TuitionRequestsController {
  constructor(private readonly tuitionService: TuitionRequestsService) {}

  /* ============================================================================
   * 1. Public / Tutor Job Board
   * ========================================================================= */

  @Get('job-board')
  async getJobBoard(
    @Query() query: GetTuitionRequestsQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const data = await this.tuitionService.getJobBoard(query, user);
    return { success: true, data };
  }

  /* ============================================================================
   * 2. Guardian / Student Endpoints
   * ========================================================================= */

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTuitionRequestDto,
  ) {
    const data = await this.tuitionService.createRequest(user, dto);
    return {
      success: true,
      message: 'Tuition request submitted successfully. Our academic team is matching the best tutors.',
      data,
    };
  }

  @Get('my-requests')
  @UseGuards(AuthGuard)
  async getMyRequests(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.tuitionService.getGuardianRequests(user);
    return { success: true, data };
  }

  @Post('suggestions/:id/respond')
  @UseGuards(AuthGuard)
  async respondToSuggestion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) suggestionId: string,
    @Body() dto: RespondSuggestionDto,
  ) {
    const data = await this.tuitionService.respondToSuggestion(suggestionId, user, dto);
    return {
      success: true,
      message: `Suggestion successfully ${dto.action === 'accept' ? 'accepted' : dto.action === 'request_demo' ? 'demo scheduled' : 'declined'}`,
      data,
    };
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard)
  async cancelRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tuitionService.cancelRequest(id, user);
    return { success: true, message: 'Tuition request cancelled', data };
  }

  /* ============================================================================
   * 3. Tutor Endpoints
   * ========================================================================= */

  @Post(':id/apply')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async applyForTuition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyTuitionRequestDto,
  ) {
    const data = await this.tuitionService.applyForTuition(id, user, dto);
    return {
      success: true,
      message: 'Application submitted successfully. Admin will review and inform the guardian.',
      data,
    };
  }

  @Get('my-applications')
  @UseGuards(AuthGuard)
  async getMyApplications(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.tuitionService.getTutorApplications(user);
    return { success: true, data };
  }

  /* ============================================================================
   * 4. Single Request Details
   * ========================================================================= */

  @Get(':id')
  @UseGuards(AuthGuard)
  async getRequestById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.tuitionService.getRequestById(id, user);
    return { success: true, data };
  }

  /* ============================================================================
   * 5. Admin Desk & Matching Endpoints
   * ========================================================================= */

  @Get('admin/all')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async getAdminRequests(@Query() query: GetTuitionRequestsQueryDto) {
    const data = await this.tuitionService.getAdminRequests(query);
    return { success: true, data };
  }

  @Get('admin/:id/candidates')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async getCandidates(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.tuitionService.getMatchCandidates(id);
    return { success: true, data };
  }

  @Post('admin/:id/suggest')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async suggestTutor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuggestTutorsDto,
  ) {
    const data = await this.tuitionService.suggestTutor(id, user, dto);
    return {
      success: true,
      message: 'Tutor suggested to the guardian successfully',
      data,
    };
  }

  @Patch('admin/:id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: any,
  ) {
    const data = await this.tuitionService.updateStatus(id, status, user);
    return { success: true, message: 'Status updated successfully', data };
  }
}
