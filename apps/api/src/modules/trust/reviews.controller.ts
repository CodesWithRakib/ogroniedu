import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, TutorReplyDto, ModerateReviewDto } from './dto';

@ApiTags('Trust & Reviews')
@Controller('api/v1/reviews')
export class ReviewsController {
  constructor(
    @Inject(ReviewsService)
    private readonly reviewsService: ReviewsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a verified review for a completed booking' })
  @ApiResponse({ status: 201, description: 'Review successfully submitted' })
  async createReview(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(user, dto);
  }

  @Get('tutors/:tutorId')
  @ApiOperation({ summary: 'Get published reviews for a tutor' })
  @ApiResponse({ status: 200, description: 'List of tutor reviews' })
  async getTutorReviews(@Param('tutorId') tutorId: string, @Query('all') all?: string) {
    return this.reviewsService.getTutorReviews(tutorId, all === 'true');
  }

  @Post(':id/reply')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tutor formal rebuttal response to a review' })
  @ApiResponse({ status: 200, description: 'Reply posted' })
  async replyToReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reviewId: string,
    @Body() dto: TutorReplyDto,
  ) {
    return this.reviewsService.replyToReview(user, reviewId, dto);
  }

  @Patch(':id/moderate')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin review moderation (flag / hide / publish)' })
  @ApiResponse({ status: 200, description: 'Review moderation updated' })
  async moderateReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') reviewId: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateReview(user, reviewId, dto);
  }
}
