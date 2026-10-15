import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LedgerService } from '../payments/ledger.service';
import { AnalyticsTimeQueryDto } from './dto';
import type { TimeBounds } from './interfaces/time-bounds.interface';
import { AnalyticsTutorService } from './services/analytics-tutor.service';
import { asSqlRows, toNumber, resolveTimeBounds } from './utils/analytics-sql.util';

export type { TimeBounds } from './interfaces/time-bounds.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
    @Inject(AnalyticsTutorService)
    private readonly tutorAnalytics: AnalyticsTutorService,
  ) {}

  /**
   * Helper: Parse and validate time boundaries preventing temporal inversion.
   * Delegates to the shared resolver (kept as a method for compatibility).
   */
  public parseTimeBounds(query: AnalyticsTimeQueryDto): TimeBounds {
    return resolveTimeBounds(query);
  }

  /**
   * 1. Operational Overview: Conversion funnel, completion reliability, GMV, and trust metrics
   */
  async getOperationalOverview(query: AnalyticsTimeQueryDto) {
    const { start, end } = this.parseTimeBounds(query);

    // 1.1. Booking Conversion Funnel
    const bookingFunnelRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as total_requests,
         COUNT(id) FILTER (WHERE status IN ('confirmed', 'in_progress', 'completed'))::int as confirmed_bookings,
         COUNT(id) FILTER (WHERE status = 'cancelled')::int as cancelled_requests,
         COUNT(id) FILTER (WHERE status = 'declined')::int as declined_requests
       FROM bookings
       WHERE created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const totalRequests = bookingFunnelRes[0]?.total_requests || 0;
    const confirmedBookings = bookingFunnelRes[0]?.confirmed_bookings || 0;
    const cancelledRequests = bookingFunnelRes[0]?.cancelled_requests || 0;
    const declinedRequests = bookingFunnelRes[0]?.declined_requests || 0;
    const conversionRate =
      totalRequests > 0 ? Number(((confirmedBookings / totalRequests) * 100).toFixed(2)) : 0;

    // 1.2. Session Reliability & Completion
    const sessionsRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as total_sessions,
         COUNT(id) FILTER (WHERE status = 'completed')::int as completed_sessions,
         COUNT(id) FILTER (WHERE status = 'cancelled')::int as cancelled_sessions,
         COUNT(id) FILTER (WHERE status = 'no_show')::int as no_show_sessions,
         COUNT(id) FILTER (WHERE status = 'scheduled')::int as scheduled_sessions
       FROM booking_sessions
       WHERE starts_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const totalSessions = sessionsRes[0]?.total_sessions || 0;
    const completedSessions = sessionsRes[0]?.completed_sessions || 0;
    const cancelledSessions = sessionsRes[0]?.cancelled_sessions || 0;
    const noShowSessions = sessionsRes[0]?.no_show_sessions || 0;
    const scheduledSessions = sessionsRes[0]?.scheduled_sessions || 0;

    const completionRate =
      totalSessions > 0 ? Number(((completedSessions / totalSessions) * 100).toFixed(2)) : 0;
    const sessionCancellationRate =
      totalSessions > 0 ? Number(((cancelledSessions / totalSessions) * 100).toFixed(2)) : 0;
    const noShowRate =
      totalSessions > 0 ? Number(((noShowSessions / totalSessions) * 100).toFixed(2)) : 0;

    // 1.3. Financial Gross Merchandise Volume (GMV) & Refunds
    const paymentsRes = await this.dataSource.query(
      `SELECT 
         COALESCE(SUM(amount_minor), 0)::bigint as total_gmv_minor,
         COUNT(id)::int as total_orders
       FROM payment_orders
       WHERE status = 'succeeded' AND created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const refundsRes = await this.dataSource.query(
      `SELECT 
         COALESCE(SUM(amount_minor), 0)::bigint as total_refunds_minor,
         COUNT(id)::int as total_refund_count
       FROM payment_refunds
       WHERE status = 'succeeded' AND created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const gmvMinor = BigInt(paymentsRes[0]?.total_gmv_minor || 0);
    const refundsMinor = BigInt(refundsRes[0]?.total_refunds_minor || 0);
    const netVolumeMinor = gmvMinor - refundsMinor;

    const gmvBdt = Number(gmvMinor) / 100;
    const totalRefundedBdt = Number(refundsMinor) / 100;
    const netProcessedVolumeBdt = Number(netVolumeMinor) / 100;
    // Platform revenue model: 8% commission on completed milestones
    const platformCommissionRevenueBdt = Number((gmvBdt * 0.08).toFixed(2));
    const refundRate = gmvBdt > 0 ? Number(((totalRefundedBdt / gmvBdt) * 100).toFixed(2)) : 0;

    // 1.4. Trust, Reviews & Replacement Guarantee
    const reviewsRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as total_reviews,
         COALESCE(ROUND(AVG(rating)::numeric, 2), 5.0) as average_rating,
         COALESCE(ROUND(AVG(punctuality_rating)::numeric, 2), 5.0) as punctuality_rating,
         COALESCE(ROUND(AVG(teaching_clarity_rating)::numeric, 2), 5.0) as teaching_clarity_rating,
         COALESCE(ROUND(AVG(subject_mastery_rating)::numeric, 2), 5.0) as subject_mastery_rating
       FROM reviews
       WHERE created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const replacementCasesRes = await this.dataSource.query(
      `SELECT COUNT(id)::int as count FROM tutor_replacement_cases WHERE created_at BETWEEN $1 AND $2;`,
      [start, end],
    );
    const replacementCasesCount = replacementCasesRes[0]?.count || 0;
    const replacementRate =
      confirmedBookings > 0
        ? Number(((replacementCasesCount / confirmedBookings) * 100).toFixed(2))
        : 0;

    const safetyReportsRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as total_safety,
         COUNT(id) FILTER (WHERE escalation_level = 'urgent_child_safety' OR severity = 'critical')::int as critical_safety
       FROM safety_reports
       WHERE created_at BETWEEN $1 AND $2;`,
      [start, end],
    );
    const safetyReportsCount = safetyReportsRes[0]?.total_safety || 0;
    const criticalSafetyCount = safetyReportsRes[0]?.critical_safety || 0;

    // 1.5. Daily Operational Trends
    const trendsRes = await this.dataSource.query(
      `SELECT 
         DATE_TRUNC('day', b.created_at)::date as metric_date,
         COUNT(b.id)::int as requests,
         COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'in_progress', 'completed'))::int as confirmed
       FROM bookings b
       WHERE b.created_at BETWEEN $1 AND $2
       GROUP BY DATE_TRUNC('day', b.created_at)::date
       ORDER BY metric_date ASC;`,
      [start, end],
    );

    return {
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      conversion: {
        totalRequests,
        confirmedBookings,
        cancelledRequests,
        declinedRequests,
        conversionRate,
      },
      sessions: {
        totalSessions,
        completedSessions,
        cancelledSessions,
        noShowSessions,
        scheduledSessions,
        completionRate,
        sessionCancellationRate,
        noShowRate,
      },
      financials: {
        grossMerchandiseValueBdt: gmvBdt,
        totalRefundedBdt,
        netProcessedVolumeBdt,
        platformCommissionRevenueBdt,
        refundRate,
        successfulOrdersCount: paymentsRes[0]?.total_orders || 0,
        refundsCount: refundsRes[0]?.total_refund_count || 0,
      },
      trustAndQuality: {
        averageRating: Number(reviewsRes[0]?.average_rating || 5.0),
        totalReviews: reviewsRes[0]?.total_reviews || 0,
        punctualityRating: Number(reviewsRes[0]?.punctuality_rating || 5.0),
        teachingClarityRating: Number(reviewsRes[0]?.teaching_clarity_rating || 5.0),
        subjectMasteryRating: Number(reviewsRes[0]?.subject_mastery_rating || 5.0),
        replacementCasesCount,
        replacementRate,
        safetyReportsCount,
        criticalSafetyCount,
      },
      trends: asSqlRows(trendsRes).map((r) => ({
        date: r.metric_date,
        requests: r.requests,
        confirmed: r.confirmed,
      })),
    };
  }

  /**
   * 2. Financial Analytics & Double-Entry Ledger Source-of-Truth
   */
  async getFinancialAnalytics(query: AnalyticsTimeQueryDto) {
    const { start, end } = this.parseTimeBounds(query);

    // Provider Breakdown
    const providersRes = await this.dataSource.query(
      `SELECT 
         provider,
         COUNT(id)::int as orders_count,
         COALESCE(SUM(amount_minor), 0)::bigint as volume_minor
       FROM payment_orders
       WHERE status = 'succeeded' AND created_at BETWEEN $1 AND $2
       GROUP BY provider;`,
      [start, end],
    );

    const providerBreakdown = asSqlRows(providersRes).map((p) => ({
      provider: p.provider,
      ordersCount: p.orders_count,
      volumeBdt: toNumber(p.volume_minor) / 100,
    }));

    // Refunds Reason Breakdown
    const refundReasonsRes = await this.dataSource.query(
      `SELECT 
         COALESCE(reason, 'unspecified') as reason,
         COUNT(id)::int as count,
         COALESCE(SUM(amount_minor), 0)::bigint as amount_minor
       FROM payment_refunds
       WHERE status = 'succeeded' AND created_at BETWEEN $1 AND $2
       GROUP BY reason;`,
      [start, end],
    );

    const refundBreakdown = asSqlRows(refundReasonsRes).map((r) => ({
      reason: r.reason,
      count: r.count,
      amountBdt: toNumber(r.amount_minor) / 100,
    }));

    // Ledger Reconciliation Check
    const ledgerReconciliation = await this.ledgerService.runReconciliation();

    return {
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      providerBreakdown,
      refundBreakdown,
      ledgerReconciliation,
    };
  }

  /**
   * 3. Tutor Performance Analytics & Response Metrics
   */
  /**
   * 3. Tutor Performance Leaderboard & Response Times (delegates to the
   * tutor analytics service; kept here for backward compatibility).
   */
  async getTutorPerformanceAnalytics(query: AnalyticsTimeQueryDto) {
    return this.tutorAnalytics.getTutorPerformanceAnalytics(query);
  }

  /**
   * 4. Learner Retention & Re-Booking Cohorts
   */
  async getRetentionAnalytics(query: AnalyticsTimeQueryDto) {
    const { start, end } = this.parseTimeBounds(query);

    const cohortRes = await this.dataSource.query(
      `WITH learner_bookings AS (
         SELECT 
           student_user_id,
           COUNT(id)::int as booking_count
         FROM bookings
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY student_user_id
       )
       SELECT 
         COUNT(student_user_id)::int as total_unique_learners,
         COUNT(student_user_id) FILTER (WHERE booking_count >= 2)::int as repeat_learners,
         COUNT(student_user_id) FILTER (WHERE booking_count >= 3)::int as loyal_learners
       FROM learner_bookings;`,
      [start, end],
    );

    const totalUniqueLearners = cohortRes[0]?.total_unique_learners || 0;
    const repeatLearners = cohortRes[0]?.repeat_learners || 0;
    const loyalLearners = cohortRes[0]?.loyal_learners || 0;
    const retentionRate =
      totalUniqueLearners > 0
        ? Number(((repeatLearners / totalUniqueLearners) * 100).toFixed(2))
        : 0;

    return {
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      totalUniqueLearners,
      repeatLearners,
      loyalLearners,
      retentionRate,
    };
  }

  /**
   * 5. Personal Tutor Analytics (delegates to the tutor analytics service;
   * kept here for backward compatibility).
   */
  async getMyTutorAnalytics(tutorUserId: string, query: AnalyticsTimeQueryDto) {
    return this.tutorAnalytics.getMyTutorAnalytics(tutorUserId, query);
  }
}
