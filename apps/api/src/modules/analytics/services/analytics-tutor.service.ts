import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalyticsTimeQueryDto } from '../dto';
import { asSqlRows, toNumber, resolveTimeBounds } from '../utils/analytics-sql.util';

/**
 * Tutor-scoped analytics: platform leaderboard + personal tutor dashboard.
 * Extracted from AnalyticsService (Phase 23 P1-4b) — needs only the
 * DataSource (no ledger coupling), unlike platform financial analytics.
 */
@Injectable()
export class AnalyticsTutorService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getTutorPerformanceAnalytics(query: AnalyticsTimeQueryDto) {
    const { start, end } = resolveTimeBounds(query);

    // Response time (hours from requested to accepted/declined)
    const responseTimeRes = await this.dataSource.query(
      `SELECT 
         COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::numeric, 1), 2.5) as avg_response_hours
       FROM bookings
       WHERE status IN ('confirmed', 'declined') AND created_at BETWEEN $1 AND $2;`,
      [start, end],
    );
    const avgResponseHours = Number(responseTimeRes[0]?.avg_response_hours || 2.5);

    // Tutor Leaderboard (Completed sessions and ratings)
    const leaderboardRes = await this.dataSource.query(
      `SELECT 
         u.id as tutor_user_id,
         u.display_name as tutor_name,
         COUNT(bs.id) FILTER (WHERE bs.status = 'completed')::int as completed_sessions,
         COUNT(bs.id) FILTER (WHERE bs.status = 'no_show')::int as no_show_sessions,
         COALESCE(ROUND(AVG(r.rating)::numeric, 2), 5.0) as average_rating
       FROM users u
       JOIN tutor_profiles tp ON tp.user_id = u.id
       LEFT JOIN booking_sessions bs ON bs.tutor_user_id = u.id AND bs.starts_at BETWEEN $1 AND $2
       LEFT JOIN reviews r ON r.tutor_user_id = u.id
       GROUP BY u.id, u.display_name
       ORDER BY completed_sessions DESC
       LIMIT 20;`,
      [start, end],
    );

    // Subject Demand & Completion
    const subjectsRes = await this.dataSource.query(
      `SELECT 
         s.name_en,
         s.name_bn,
         COUNT(b.id)::int as total_bookings,
         COUNT(bs.id) FILTER (WHERE bs.status = 'completed')::int as completed_sessions
       FROM subjects s
       JOIN bookings b ON b.subject_id = s.id AND b.created_at BETWEEN $1 AND $2
       LEFT JOIN booking_sessions bs ON bs.booking_id = b.id
       GROUP BY s.id, s.name_en, s.name_bn
       ORDER BY total_bookings DESC
       LIMIT 10;`,
      [start, end],
    );

    return {
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      avgResponseHours,
      topTutors: asSqlRows(leaderboardRes).map((t) => ({
        tutorUserId: t.tutor_user_id,
        tutorName: t.tutor_name,
        completedSessions: t.completed_sessions,
        noShowSessions: t.no_show_sessions,
        averageRating: toNumber(t.average_rating),
      })),
      subjects: asSqlRows(subjectsRes).map((s) => ({
        nameEn: s.name_en,
        nameBn: s.name_bn,
        totalBookings: s.total_bookings,
        completedSessions: s.completed_sessions,
      })),
    };
  }

  /**
   * Personal Tutor Analytics (ABAC Scoped strictly to logged-in tutor)
   */
  async getMyTutorAnalytics(tutorUserId: string, query: AnalyticsTimeQueryDto) {
    const { start, end } = resolveTimeBounds(query);

    const inquiriesRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as total_inquiries,
         COUNT(id) FILTER (WHERE status IN ('confirmed', 'in_progress', 'completed'))::int as accepted_inquiries,
         COUNT(id) FILTER (WHERE status = 'declined')::int as declined_inquiries
       FROM bookings
       WHERE tutor_user_id = $1 AND created_at BETWEEN $2 AND $3;`,
      [tutorUserId, start, end],
    );

    const totalInquiries = inquiriesRes[0]?.total_inquiries || 0;
    const acceptedInquiries = inquiriesRes[0]?.accepted_inquiries || 0;
    const acceptanceRate =
      totalInquiries > 0 ? Number(((acceptedInquiries / totalInquiries) * 100).toFixed(2)) : 0;

    const sessionsRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as total_sessions,
         COUNT(id) FILTER (WHERE status = 'completed')::int as completed_sessions,
         COUNT(id) FILTER (WHERE status = 'no_show')::int as no_show_sessions
       FROM booking_sessions
       WHERE tutor_user_id = $1 AND starts_at BETWEEN $2 AND $3;`,
      [tutorUserId, start, end],
    );

    const totalSessions = sessionsRes[0]?.total_sessions || 0;
    const completedSessions = sessionsRes[0]?.completed_sessions || 0;
    const noShowSessions = sessionsRes[0]?.no_show_sessions || 0;
    const completionRate =
      totalSessions > 0 ? Number(((completedSessions / totalSessions) * 100).toFixed(2)) : 0;

    // Earnings: sum of completed session amounts
    const earningsRes = await this.dataSource.query(
      `SELECT 
         COALESCE(SUM(b.price_per_session_minor), 0)::bigint as total_earnings_minor
       FROM booking_sessions bs
       JOIN bookings b ON b.id = bs.booking_id
       WHERE bs.tutor_user_id = $1 AND bs.status = 'completed' AND bs.starts_at BETWEEN $2 AND $3;`,
      [tutorUserId, start, end],
    );
    const totalEarningsBdt = Number(BigInt(earningsRes[0]?.total_earnings_minor || 0)) / 100;

    const ratingRes = await this.dataSource.query(
      `SELECT 
         COUNT(id)::int as reviews_count,
         COALESCE(ROUND(AVG(rating)::numeric, 2), 5.0) as average_rating
       FROM reviews
       WHERE tutor_user_id = $1;`,
      [tutorUserId],
    );

    return {
      tutorUserId,
      timeWindow: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      inquiries: {
        totalInquiries,
        acceptedInquiries,
        declinedInquiries: inquiriesRes[0]?.declined_inquiries || 0,
        acceptanceRate,
      },
      sessions: {
        totalSessions,
        completedSessions,
        noShowSessions,
        completionRate,
      },
      earnings: {
        totalEarningsBdt,
      },
      feedback: {
        reviewsCount: ratingRes[0]?.reviews_count || 0,
        averageRating: Number(ratingRes[0]?.average_rating || 5.0),
      },
    };
  }
}
