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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { paginated } from '../../common/api-response/api-response';
import { LessonPlansService } from './services/lesson-plans.service';
import { LearningMaterialsService } from './services/learning-materials.service';
import {
  CreateLessonPlanDto,
  UpdateLessonPlanDto,
  UploadLearningMaterialDto,
  CreateLinkMaterialDto,
  UpdateLearningMaterialDto,
  LearningListQueryDto,
} from './dto';

@Controller('api/v1/learning')
export class LessonContentController {
  constructor(
    @Inject(LessonPlansService)
    private readonly plans: LessonPlansService,
    @Inject(LearningMaterialsService)
    private readonly materials: LearningMaterialsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lesson plans
  // ---------------------------------------------------------------------------

  @Post('lesson-plans')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLessonPlanDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const plan = await this.plans.createLessonPlan(user, dto, requestId);
    return { success: true, message: 'Lesson plan created.', data: plan };
  }

  @Get('lesson-plans')
  @UseGuards(AuthGuard)
  async listPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LearningListQueryDto,
  ) {
    const result = await this.plans.listLessonPlans(user, query);
    return paginated(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Get('lesson-plans/:id')
  @UseGuards(AuthGuard)
  async getPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const plan = await this.plans.getLessonPlan(user, id);
    return { success: true, data: plan };
  }

  @Patch('lesson-plans/:id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonPlanDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const plan = await this.plans.updateLessonPlan(user, id, dto, requestId);
    return { success: true, message: 'Lesson plan updated.', data: plan };
  }

  @Post('lesson-plans/:id/publish')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async publishPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const plan = await this.plans.publishLessonPlan(user, id, requestId);
    return { success: true, message: 'Lesson plan published.', data: plan };
  }

  @Post('lesson-plans/:id/archive')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async archivePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const plan = await this.plans.archiveLessonPlan(user, id, requestId);
    return { success: true, message: 'Lesson plan archived.', data: plan };
  }

  @Get('sessions/:sessionId/lesson-plan')
  @UseGuards(AuthGuard)
  async getSessionPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const plan = await this.plans.getSessionLessonPlan(user, sessionId);
    return { success: true, data: plan };
  }

  // ---------------------------------------------------------------------------
  // Materials
  // ---------------------------------------------------------------------------

  @Post('materials/upload')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async uploadMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadLearningMaterialDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const material = await this.materials.uploadFile(user, dto, requestId);
    return { success: true, message: 'Learning material uploaded.', data: material };
  }

  @Post('materials/link')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLinkMaterialDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const material = await this.materials.createLink(user, dto, requestId);
    return { success: true, message: 'Learning link added.', data: material };
  }

  @Get('bookings/:bookingId/materials')
  @UseGuards(AuthGuard)
  async listBookingMaterials(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Query() query: LearningListQueryDto,
  ) {
    const result = await this.materials.listBookingMaterials(user, bookingId, query);
    return paginated(result.items, {
      page: result.page,
      pageSize: result.pageSize,
      totalItems: result.totalItems,
    });
  }

  @Get('sessions/:sessionId/materials')
  @UseGuards(AuthGuard)
  async listSessionMaterials(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const materials = await this.materials.listSessionMaterials(user, sessionId);
    return { success: true, data: materials };
  }

  @Patch('materials/:id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningMaterialDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const material = await this.materials.updateMaterial(user, id, dto, requestId);
    return { success: true, message: 'Material updated.', data: material };
  }

  @Post('materials/:id/publish')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async publishMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const material = await this.materials.publishMaterial(user, id, requestId);
    return { success: true, message: 'Material published.', data: material };
  }

  @Post('materials/:id/archive')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async archiveMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const material = await this.materials.archiveMaterial(user, id, requestId);
    return { success: true, message: 'Material archived.', data: material };
  }

  /**
   * Authorized binary download. Writes headers directly and bypasses the
   * success-envelope interceptor because the response is a file stream.
   */
  @Get('materials/:id/download')
  @UseGuards(AuthGuard)
  async downloadMaterial(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.materials.downloadMaterial(user, id);
    res.setHeader('Content-Type', file.mediaType);
    res.setHeader('Content-Length', String(file.buffer.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.filename)}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(file.buffer);
  }
}
