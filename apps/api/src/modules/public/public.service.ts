import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { PlatformStats } from './interfaces/platform-stats.interface';

export type { PlatformStats } from './interfaces/platform-stats.interface';

/**
 * Unauthenticated platform aggregates for the public site.
 * Count-only queries (no PII); safe to cache aggressively at the edge.
 */
@Injectable()
export class PublicService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getPlatformStats(): Promise<PlatformStats> {
    // Failures propagate as 500 (sanitized envelope); the public site hides
    // the metrics band on error rather than showing fabricated zeros.
    const [tutors, students, sessions, rating] = await Promise.all([
      this.dataSource.query(
        `SELECT count(*)::int AS count FROM tutor_profiles
         WHERE verification_status = 'approved' AND publication_status = 'published';`,
      ),
      this.dataSource.query(
        `SELECT count(DISTINCT u.id)::int AS count FROM users u
         JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
         JOIN roles r ON r.id = ur.role_id AND r.code = 'student'
         WHERE u.status = 'active' AND u.deleted_at IS NULL;`,
      ),
      this.dataSource.query(
        `SELECT count(*)::int AS count FROM booking_sessions WHERE status = 'completed';`,
      ),
      this.dataSource.query(`SELECT round(avg(rating)::numeric, 1)::float AS avg FROM reviews;`),
    ]);
    const avgRaw: unknown = rating?.[0]?.avg;
    const averageRating = typeof avgRaw === 'number' && Number.isFinite(avgRaw) ? avgRaw : null;
    return {
      verifiedTutors: toCount(tutors?.[0]?.count),
      activeStudents: toCount(students?.[0]?.count),
      completedSessions: toCount(sessions?.[0]?.count),
      averageRating,
    };
  }
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}
