import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { CompleteOnboardingStepDto } from './dto/complete-onboarding-step.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import type { OnboardingStatus } from './interfaces/onboarding-status.interface';

@ApiTags('Onboarding')
@ApiBearerAuth()
@Controller('api/v1/onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(
    @Inject(OnboardingService)
    private readonly onboardingService: OnboardingService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: "Current user's derived onboarding status for their role track" })
  async getMyOnboarding(@CurrentUser() user: AuthenticatedUser): Promise<OnboardingStatus> {
    return this.onboardingService.getStatus(user.id);
  }

  @Post('steps/:stepKey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete or submit one onboarding step for the current user' })
  async completeStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('stepKey') stepKey: string,
    @Body() dto: CompleteOnboardingStepDto,
  ): Promise<OnboardingStatus> {
    return this.onboardingService.completeStep(user.id, stepKey, dto.payload ?? {});
  }
}
