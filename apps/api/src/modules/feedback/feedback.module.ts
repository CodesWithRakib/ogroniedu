import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetaFeedbackEntity } from './entities/beta-feedback.entity';
import { FeedbackService } from './feedback.service';
import { FeedbackController, AdminFeedbackController } from './feedback.controller';
import { AuditModule } from '../audit/audit.module';
import { RateLimiterService } from '../auth/rate-limiter.service';

@Module({
  imports: [TypeOrmModule.forFeature([BetaFeedbackEntity]), forwardRef(() => AuditModule)],
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService, RateLimiterService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
