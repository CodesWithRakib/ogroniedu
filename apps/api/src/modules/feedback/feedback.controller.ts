import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { TriageFeedbackDto } from './dto/triage-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';

@Controller('api/v1/feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Submit new beta feedback (authenticated users).
   */
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const result = await this.feedbackService.submitFeedback(dto, user, clientIp);
    return {
      success: true,
      data: result,
      requestId: (req as any).requestId || 'feedback-req',
    };
  }

  /**
   * View reporter's own submitted feedback.
   */
  @Get('my')
  @UseGuards(AuthGuard)
  async getMyFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const result = await this.feedbackService.getMyFeedback(user.id, pageNum, limitNum);
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        timestamp: new Date().toISOString(),
      },
      requestId: (req as any)?.requestId || 'feedback-my-req',
    };
  }

  /**
   * View specific feedback item.
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async getFeedbackById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.feedbackService.getFeedbackById(id, user);
    return {
      success: true,
      data: result,
      requestId: (req as any).requestId || 'feedback-item-req',
    };
  }
}

@Controller('api/v1/admin/feedback')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin', 'support_agent')
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Administrative query of all beta feedback items with filtering.
   */
  @Get()
  async queryFeedback(@Query() query: QueryFeedbackDto, @Req() req: Request) {
    const result = await this.feedbackService.queryAdminFeedback(query);
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        timestamp: new Date().toISOString(),
      },
      requestId: (req as any).requestId || 'admin-feedback-req',
    };
  }

  /**
   * Triage a feedback record (assign severity, update status, add notes).
   */
  @Patch(':id/triage')
  async triageFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TriageFeedbackDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.feedbackService.triageFeedback(id, dto, actor);
    return {
      success: true,
      data: result,
      requestId: (req as any).requestId || 'admin-triage-req',
    };
  }
}
