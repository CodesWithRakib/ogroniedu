import { Injectable, Logger, Inject, Optional, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LedgerService } from '../payments/ledger.service';
import { AnalyticsTimeQueryDto } from './dto';
import type { TimeBounds } from './interfaces/time-bounds.interface';
import { AnalyticsTutorService } from './services/analytics-tutor.service';
import { asSqlRows, toNumber, resolveTimeBounds } from './utils/analytics-sql.util';
import { arrayToCsv } from './utils/csv-sanitizer.util';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import type { ExportReportDto } from './dto';

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
    @Optional()
    @Inject(AuditService)
    private readonly auditService?: AuditService,
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
   * 4b. Multi-Stage Booking & Discovery Funnel Analysis
   * Stages: Search -> Profile View -> Booking Started -> Request Submitted -> Confirmed -> Paid -> Completed
   */
  async getFunnelAnalytics(query: AnalyticsTimeQueryDto) {
    const { start, end } = this.parseTimeBounds(query);

    const eventCountsRes = await this.dataSource.query(
      `SELECT 
         COUNT(id) FILTER (WHERE event_name = 'tutor_search_performed')::int as search_count,
         COUNT(id) FILTER (WHERE event_name = 'tutor_profile_viewed')::int as profile_views_count,
         COUNT(id) FILTER (WHERE event_name = 'booking_started')::int as booking_started_count
       FROM product_analytics_events
       WHERE created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const zeroResultSearchesRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as zero_result_count
       FROM product_analytics_events
       WHERE event_name = 'tutor_search_performed' 
         AND (properties->>'result_count')::int = 0
         AND created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const bookingsRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as total_requested,
         COUNT(id) FILTER (WHERE status IN ('confirmed', 'in_progress', 'completed'))::int as confirmed
       FROM bookings
       WHERE created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const paymentsRes = await this.dataSource.query(
      `SELECT COUNT(id)::int as succeeded_payments
       FROM payment_orders
       WHERE status = 'succeeded' AND created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const sessionsRes = await this.dataSource.query(
      `SELECT COUNT(id)::int as completed_sessions
       FROM booking_sessions
       WHERE status = 'completed' AND starts_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const searchCount = eventCountsRes[0]?.search_count || 0;
    const profileViews = eventCountsRes[0]?.profile_views_count || 0;
    const bookingStarted = eventCountsRes[0]?.booking_started_count || 0;
    const requestsSubmitted = bookingsRes[0]?.total_requested || 0;
    const bookingsConfirmed = bookingsRes[0]?.confirmed || 0;
    const paymentsSucceeded = paymentsRes[0]?.succeeded_payments || 0;
    const sessionsCompleted = sessionsRes[0]?.completed_sessions || 0;

    const zeroResultCount = zeroResultSearchesRes[0]?.zero_result_count || 0;
    const zeroResultRate = searchCount > 0 ? Number(((zeroResultCount / searchCount) * 100).toFixed(2)) : 0;

    const rawStages = [
      { key: 'tutor_search', label: 'Tutor Searches', count: searchCount },
      { key: 'profile_view', label: 'Profile Views', count: profileViews },
      { key: 'booking_started', label: 'Bookings Started', count: bookingStarted },
      { key: 'booking_submitted', label: 'Requests Submitted', count: requestsSubmitted },
      { key: 'booking_confirmed', label: 'Bookings Confirmed', count: bookingsConfirmed },
      { key: 'payment_completed', label: 'Payments Captured', count: paymentsSucceeded },
      { key: 'lesson_completed', label: 'First Lessons Completed', count: sessionsCompleted },
    ];

    const baseline = searchCount > 0 ? searchCount : (profileViews > 0 ? profileViews : requestsSubmitted);

    const stages = rawStages.map((stage, idx) => {
      const prevCount = idx === 0 ? stage.count : rawStages[idx - 1].count;
      const conversionFromPrev = prevCount > 0 ? Number(((stage.count / prevCount) * 100).toFixed(2)) : 0;
      const overallConversion = baseline > 0 ? Number(((stage.count / baseline) * 100).toFixed(2)) : 0;
      const dropOffRate = Number(Math.max(0, 100 - conversionFromPrev).toFixed(2));

      return {
        stageIndex: idx + 1,
        stageKey: stage.key,
        label: stage.label,
        count: stage.count,
        conversionRateFromPrevious: conversionFromPrev,
        overallConversionRate: overallConversion,
        dropOffRate,
      };
    });

    return {
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      stages,
      zeroResultSearches: {
        totalSearches: searchCount,
        zeroResultCount,
        zeroResultRate,
      },
    };
  }

  /**
   * 4c. Role-Specific User Activation Metrics (Student, Guardian, Tutor)
   */
  async getActivationAnalytics(query: AnalyticsTimeQueryDto) {
    const { start, end } = this.parseTimeBounds(query);

    const studentRes = await this.dataSource.query(
      `SELECT 
         COUNT(u.id)::int as registered_students,
         COUNT(u.id) FILTER (WHERE u.is_onboarded = true)::int as onboarded_students,
         COUNT(DISTINCT b.student_user_id)::int as active_students
       FROM users u
       LEFT JOIN bookings b ON b.student_user_id = u.id AND b.created_at BETWEEN $1 AND $2
       WHERE u.role = 'student' AND u.created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const guardianRes = await this.dataSource.query(
      `SELECT 
         COUNT(u.id)::int as registered_guardians,
         COUNT(DISTINCT gsl.guardian_user_id)::int as linked_guardians,
         COUNT(DISTINCT b.student_user_id)::int as active_guardians
       FROM users u
       LEFT JOIN guardian_student_links gsl ON gsl.guardian_user_id = u.id AND gsl.is_verified = true
       LEFT JOIN bookings b ON b.student_user_id = gsl.student_user_id AND b.created_at BETWEEN $1 AND $2
       WHERE u.role = 'guardian' AND u.created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const tutorRes = await this.dataSource.query(
      `SELECT 
         COUNT(u.id)::int as registered_tutors,
         COUNT(tp.user_id) FILTER (WHERE tp.publication_status = 'published')::int as published_tutors,
         COUNT(tp.user_id) FILTER (WHERE tp.verification_status = 'verified')::int as verified_tutors,
         COUNT(DISTINCT b.tutor_user_id) FILTER (WHERE b.status IN ('confirmed', 'in_progress', 'completed'))::int as active_tutors
       FROM users u
       JOIN tutor_profiles tp ON tp.user_id = u.id
       LEFT JOIN bookings b ON b.tutor_user_id = u.id AND b.created_at BETWEEN $1 AND $2
       WHERE u.role = 'tutor' AND u.created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const regStudents = studentRes[0]?.registered_students || 0;
    const actStudents = studentRes[0]?.active_students || 0;
    const regGuardians = guardianRes[0]?.registered_guardians || 0;
    const actGuardians = guardianRes[0]?.active_guardians || 0;
    const regTutors = tutorRes[0]?.registered_tutors || 0;
    const verTutors = tutorRes[0]?.verified_tutors || 0;
    const actTutors = tutorRes[0]?.active_tutors || 0;

    return {
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      student: {
        registered: regStudents,
        onboarded: studentRes[0]?.onboarded_students || 0,
        activeWithBookings: actStudents,
        activationRate: regStudents > 0 ? Number(((actStudents / regStudents) * 100).toFixed(2)) : 0,
      },
      guardian: {
        registered: regGuardians,
        withLinkedChildren: guardianRes[0]?.linked_guardians || 0,
        activeWithChildBookings: actGuardians,
        activationRate: regGuardians > 0 ? Number(((actGuardians / regGuardians) * 100).toFixed(2)) : 0,
      },
      tutor: {
        registered: regTutors,
        published: tutorRes[0]?.published_tutors || 0,
        verified: verTutors,
        activeWithConfirmedBookings: actTutors,
        verificationRate: regTutors > 0 ? Number(((verTutors / regTutors) * 100).toFixed(2)) : 0,
        activationRate: regTutors > 0 ? Number(((actTutors / regTutors) * 100).toFixed(2)) : 0,
      },
    };
  }

  /**
   * 4d. Learning Engagement & Homework Submission Metrics
   */
  async getLearningEngagementAnalytics(query: AnalyticsTimeQueryDto) {
    const { start, end } = this.parseTimeBounds(query);

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

    const assignmentsRes = await this.dataSource.query(
      `SELECT 
         COUNT(a.id)::int as total_assignments,
         COUNT(sub.id)::int as total_submissions,
         COUNT(sub.id) FILTER (WHERE sub.status = 'reviewed')::int as reviewed_submissions,
         COALESCE(ROUND(AVG(sub.score)::numeric, 1), 0) as average_score
       FROM assignments a
       LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
       WHERE a.created_at BETWEEN $1 AND $2;`,
      [start, end],
    );

    const totalSessions = sessionsRes[0]?.total_sessions || 0;
    const completedSessions = sessionsRes[0]?.completed_sessions || 0;
    const noShowSessions = sessionsRes[0]?.no_show_sessions || 0;
    const attendedDenominator = completedSessions + noShowSessions;
    const attendanceRate = attendedDenominator > 0 ? Number(((completedSessions / attendedDenominator) * 100).toFixed(2)) : 0;

    const totalAssignments = assignmentsRes[0]?.total_assignments || 0;
    const totalSubmissions = assignmentsRes[0]?.total_submissions || 0;
    const reviewedSubmissions = assignmentsRes[0]?.reviewed_submissions || 0;

    const submissionRate = totalAssignments > 0 ? Number(((totalSubmissions / totalAssignments) * 100).toFixed(2)) : 0;
    const reviewRate = totalSubmissions > 0 ? Number(((reviewedSubmissions / totalSubmissions) * 100).toFixed(2)) : 0;

    return {
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      sessions: {
        totalSessions,
        completedSessions,
        cancelledSessions: sessionsRes[0]?.cancelled_sessions || 0,
        noShowSessions,
        scheduledSessions: sessionsRes[0]?.scheduled_sessions || 0,
        attendanceRate,
      },
      homework: {
        totalAssignments,
        totalSubmissions,
        reviewedSubmissions,
        averageScore: Number(assignmentsRes[0]?.average_score || 0),
        submissionRate,
        reviewRate,
      },
    };
  }

  /**
   * 4e. Tenant-Isolated Organization Analytics
   */
  async getOrganizationAnalytics(organizationId: string, query: AnalyticsTimeQueryDto, actor: AuthenticatedUser) {
    const { start, end } = this.parseTimeBounds(query);

    const roles = Array.isArray(actor.roles) ? actor.roles : (actor as any).role ? [(actor as any).role] : [];
    const isPlatformAdmin = roles.includes('admin') || roles.includes('super_admin');
    if (!isPlatformAdmin) {
      const membership = await this.dataSource.query(
        `SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2
         UNION
         SELECT 'owner' as role FROM organizations WHERE id = $1 AND owner_user_id = $2;`,
        [organizationId, actor.id],
      );
      if (membership.length === 0) {
        throw new ForbiddenException('Access denied: You do not have permission to view analytics for this organization.');
      }
    }

    const orgRes = await this.dataSource.query(
      `SELECT id, name, slug, status FROM organizations WHERE id = $1;`,
      [organizationId],
    );
    if (orgRes.length === 0) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found.`);
    }

    const statsRes = await this.dataSource.query(
      `SELECT 
         COUNT(DISTINCT tp.user_id)::int as member_tutors_count,
         COUNT(b.id)::int as total_bookings,
         COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'in_progress', 'completed'))::int as confirmed_bookings,
         COUNT(DISTINCT b.student_user_id)::int as unique_students_served,
         COALESCE(SUM(b.total_price_minor) FILTER (WHERE b.status = 'completed'), 0)::bigint as completed_volume_minor
       FROM tutor_profiles tp
       LEFT JOIN bookings b ON b.tutor_user_id = tp.user_id AND b.created_at BETWEEN $1 AND $2
       WHERE tp.organization_id = $3;`,
      [start, end, organizationId],
    );

    const org = orgRes[0];
    const stats = statsRes[0];
    const totalBookings = stats?.total_bookings || 0;
    const confirmedBookings = stats?.confirmed_bookings || 0;
    const conversionRate = totalBookings > 0 ? Number(((confirmedBookings / totalBookings) * 100).toFixed(2)) : 0;
    const completedVolumeBdt = Number(BigInt(stats?.completed_volume_minor || 0)) / 100;

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
      },
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      metrics: {
        memberTutorsCount: stats?.member_tutors_count || 0,
        totalBookings,
        confirmedBookings,
        conversionRate,
        uniqueStudentsServed: stats?.unique_students_served || 0,
        completedVolumeBdt,
      },
    };
  }

  /**
   * 5. Personal Tutor Analytics (delegates to the tutor analytics service;
   * kept here for backward compatibility).
   */
  async getMyTutorAnalytics(tutorUserId: string, query: AnalyticsTimeQueryDto) {
    return this.tutorAnalytics.getMyTutorAnalytics(tutorUserId, query);
  }

  /**
   * 6. Administrative Safe CSV Report Exporter
   * Generates formula-safe CSV streams with anti-formula injection sanitization.
   */
  async exportReport(
    adminUser: AuthenticatedUser,
    dto: ExportReportDto,
  ): Promise<{ csv: string; filename: string; rowCount: number }> {
    const fromDate = dto.from ? new Date(dto.from) : new Date(Date.now() - 30 * 86400000);
    const toDate = dto.to ? new Date(dto.to) : new Date();
    const limit = dto.limit || 1000;

    let columns: Array<{ key: string; header: string }> = [];
    let rows: Array<Record<string, unknown>> = [];

    switch (dto.reportType) {
      case 'users': {
        columns = [
          { key: 'id', header: 'User ID' },
          { key: 'display_name', header: 'Display Name' },
          { key: 'email', header: 'Email' },
          { key: 'phone_e164', header: 'Phone' },
          { key: 'status', header: 'Account Status' },
          { key: 'created_at', header: 'Registered At' },
        ];
        rows = await this.dataSource.query(
          `SELECT id, display_name, email, phone_e164, status, created_at 
           FROM users 
           WHERE created_at BETWEEN $1 AND $2 AND deleted_at IS NULL 
           ORDER BY created_at DESC LIMIT $3;`,
          [fromDate, toDate, limit],
        );
        break;
      }
      case 'bookings': {
        columns = [
          { key: 'id', header: 'Booking ID' },
          { key: 'status', header: 'Status' },
          { key: 'student_user_id', header: 'Student ID' },
          { key: 'tutor_user_id', header: 'Tutor ID' },
          { key: 'created_at', header: 'Created At' },
        ];
        rows = await this.dataSource.query(
          `SELECT id, status, student_user_id, tutor_user_id, created_at 
           FROM bookings 
           WHERE created_at BETWEEN $1 AND $2 
           ORDER BY created_at DESC LIMIT $3;`,
          [fromDate, toDate, limit],
        );
        break;
      }
      case 'financial': {
        columns = [
          { key: 'id', header: 'Order ID' },
          { key: 'booking_id', header: 'Booking ID' },
          { key: 'amount_poisha', header: 'Amount (Poisha)' },
          { key: 'provider', header: 'Provider' },
          { key: 'status', header: 'Status' },
          { key: 'created_at', header: 'Date' },
        ];
        rows = await this.dataSource.query(
          `SELECT id, booking_id, amount_poisha, provider, status, created_at 
           FROM payment_orders 
           WHERE created_at BETWEEN $1 AND $2 
           ORDER BY created_at DESC LIMIT $3;`,
          [fromDate, toDate, limit],
        );
        break;
      }
      case 'tutors': {
        columns = [
          { key: 'user_id', header: 'Tutor User ID' },
          { key: 'headline', header: 'Headline' },
          { key: 'hourly_rate_minor', header: 'Hourly Rate' },
          { key: 'verification_status', header: 'Verification Status' },
          { key: 'publication_status', header: 'Publication Status' },
          { key: 'organization_id', header: 'Organization ID' },
          { key: 'created_at', header: 'Registered At' },
        ];
        rows = await this.dataSource.query(
          `SELECT user_id, headline, hourly_rate_minor, verification_status, publication_status, organization_id, created_at 
           FROM tutor_profiles 
           WHERE created_at BETWEEN $1 AND $2 
           ORDER BY created_at DESC LIMIT $3;`,
          [fromDate, toDate, limit],
        );
        break;
      }
      case 'organizations': {
        columns = [
          { key: 'id', header: 'Organization ID' },
          { key: 'name', header: 'Name' },
          { key: 'slug', header: 'Slug' },
          { key: 'type', header: 'Type' },
          { key: 'status', header: 'Status' },
          { key: 'contact_email', header: 'Contact Email' },
          { key: 'trade_license_number', header: 'Trade License' },
          { key: 'created_at', header: 'Registered At' },
        ];
        rows = await this.dataSource.query(
          `SELECT id, name, slug, type, status, contact_email, trade_license_number, created_at 
           FROM organizations 
           WHERE created_at BETWEEN $1 AND $2 
           ORDER BY created_at DESC LIMIT $3;`,
          [fromDate, toDate, limit],
        );
        break;
      }
    }

    const csv = arrayToCsv(columns, rows);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `report-${dto.reportType}-${dateStr}.csv`;

    if (this.auditService) {
      await this.auditService.record({
        actorUserId: adminUser.id,
        action: 'admin.report.exported',
        resourceType: 'analytics',
        safeMetadata: {
          reportType: dto.reportType,
          rowCount: rows.length,
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      });
    }

    return {
      csv,
      filename,
      rowCount: rows.length,
    };
  }
}
