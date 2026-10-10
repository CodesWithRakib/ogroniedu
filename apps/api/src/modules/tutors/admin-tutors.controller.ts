import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TutorsService } from './tutors.service';
import { AdminReviewTutorDto, AdminVerifyQualificationDto } from './dto';

@Controller('api/v1/admin/tutors')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AdminTutorsController {
  constructor(
    @Inject(TutorsService)
    private readonly tutorsService: TutorsService,
  ) {}

  @Get('pending')
  async getPendingTutors() {
    const list = await this.tutorsService.getPendingVerificationTutors();
    return {
      success: true,
      data: list,
    };
  }

  @Get(':tutorId/review-dossier')
  async getReviewDossier(@Param('tutorId', ParseUUIDPipe) tutorId: string) {
    const dossier = await this.tutorsService.getReviewDossier(tutorId);
    return {
      success: true,
      data: dossier,
    };
  }

  @Post(':tutorId/review')
  @HttpCode(HttpStatus.OK)
  async submitReviewDecision(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Body() dto: AdminReviewTutorDto,
  ) {
    const review = await this.tutorsService.submitReviewDecision(reviewer, tutorId, dto);
    return {
      success: true,
      message: `Review decision '${dto.decision}' recorded successfully.`,
      data: review,
    };
  }

  @Patch(':tutorId/qualifications/:qualificationId/verify')
  async verifyQualification(
    @CurrentUser() reviewer: AuthenticatedUser,
    @Param('tutorId', ParseUUIDPipe) tutorId: string,
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
    @Body() dto: AdminVerifyQualificationDto,
  ) {
    const qualification = await this.tutorsService.verifyQualification(
      reviewer,
      tutorId,
      qualificationId,
      dto.reviewStatus,
    );
    return {
      success: true,
      message: `Qualification marked as '${dto.reviewStatus}'.`,
      data: qualification,
    };
  }
}
