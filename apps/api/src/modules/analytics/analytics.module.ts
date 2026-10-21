import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsTutorService } from './services/analytics-tutor.service';
import { EventTrackingService } from './services/event-tracking.service';
import { AnalyticsController } from './analytics.controller';
import { PaymentsModule } from '../payments/payments.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthModule, PaymentsModule, AuditModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsTutorService, EventTrackingService],
  exports: [AnalyticsService, AnalyticsTutorService, EventTrackingService],
})
export class AnalyticsModule {}
