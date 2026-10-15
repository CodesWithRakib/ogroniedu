import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTutorService } from './services/analytics-tutor.service';
import { AnalyticsController } from './analytics.controller';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, PaymentsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsTutorService],
  exports: [AnalyticsService, AnalyticsTutorService],
})
export class AnalyticsModule {}
