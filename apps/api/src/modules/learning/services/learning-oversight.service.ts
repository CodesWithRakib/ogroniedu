import { ForbiddenException, Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { SessionAttendanceEntity } from '../entities/session-attendance.entity';
import { AssignmentEntity } from '../entities/assignment.entity';
import { AssignmentSubmissionEntity } from '../entities/assignment-submission.entity';
import { AdminSessionsQueryDto, AdminOverviewQueryDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { toPageSize } from '../../../common/pagination';

/**
 * Platform-operator LMS oversight. Read-only: admins observe sessions,
 * attendance coverage and homework volume. They do not see tutor private
 * drafts here, and this service cannot mutate learning records.
 */
@Injectable()
export class LearningOversightService {
  constructor(
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(SessionAttendanceEntity)
    private readonly attendanceRepo: Repository<SessionAttendanceEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,
    @InjectRepository(AssignmentSubmissionEntity)
    private readonly submissionRepo: Repository<AssignmentSubmissionEntity>,
  ) {}

  async listSessions(user: AuthenticatedUser, query: AdminSessionsQueryDto) {
    this.assertAdmin(user);
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = toPageSize(query.pageSize);

    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('session.studentUser', 'studentUser')
      .leftJoinAndSelect('session.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndMapOne(
        'session.attendanceRecord',
        SessionAttendanceEntity,
        'attendance',
        'attendance.sessionId = session.id',
      )
      .orderBy('session.startsAt', 'DESC')
      .addOrderBy('session.id', 'DESC');

    if (query.tutorId) qb.andWhere('session.tutorUserId = :tutorId', { tutorId: query.tutorId });
    if (query.studentId) {
      qb.andWhere('session.studentUserId = :studentId', { studentId: query.studentId });
    }
    if (query.bookingId) {
      qb.andWhere('session.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    if (query.status) qb.andWhere('session.status = :status', { status: query.status });
    if (query.from) qb.andWhere('session.startsAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('session.startsAt <= :to', { to: new Date(query.to) });

    const [rows, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    return {
      items: rows.map((session) => {
        const record = (
          session as unknown as { attendanceRecord?: SessionAttendanceEntity | null }
        ).attendanceRecord;
        return {
          id: session.id,
          bookingId: session.bookingId,
          startsAt: new Date(session.startsAt).toISOString(),
          endsAt: new Date(session.endsAt).toISOString(),
          timezone: session.timezone,
          status: session.status,
          subjectName:
            session.booking?.subject?.nameEn ?? session.booking?.subject?.nameBn ?? null,
          tutorName: session.tutorProfile?.user?.displayName ?? null,
          studentName: session.studentUser?.displayName ?? null,
          attendanceStatus: record?.attendanceStatus ?? null,
        };
      }),
      totalItems: total,
      page,
      pageSize,
    };
  }

  async getOverview(user: AuthenticatedUser, query: AdminOverviewQueryDto) {
    this.assertAdmin(user);
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (from > to) throw new BadRequestException('from must be before to');

    const sessionQb = this.sessionRepo
      .createQueryBuilder('session')
      .where('session.startsAt >= :from AND session.startsAt <= :to', { from, to });

    const [totalSessions, completed, cancelled, scheduled] = await Promise.all([
      sessionQb.clone().getCount(),
      sessionQb.clone().andWhere("session.status = 'completed'").getCount(),
      sessionQb.clone().andWhere("session.status = 'cancelled'").getCount(),
      sessionQb.clone().andWhere("session.status IN ('scheduled','in_progress')").getCount(),
    ]);

    const [attendanceRecorded, attendanceAttended] = await Promise.all([
      this.attendanceRepo
        .createQueryBuilder('attendance')
        .innerJoin('attendance.session', 'session')
        .where('session.startsAt >= :from AND session.startsAt <= :to', { from, to })
        .getCount(),
      this.attendanceRepo
        .createQueryBuilder('attendance')
        .innerJoin('attendance.session', 'session')
        .where('session.startsAt >= :from AND session.startsAt <= :to', { from, to })
        .andWhere("attendance.attendanceStatus IN ('present','late')")
        .getCount(),
    ]);

    const [assignmentsPublished, submissions] = await Promise.all([
      this.assignmentRepo
        .createQueryBuilder('assignment')
        .where('assignment.createdAt >= :from AND assignment.createdAt <= :to', { from, to })
        .andWhere("assignment.status = 'published'")
        .getCount(),
      this.submissionRepo
        .createQueryBuilder('submission')
        .where('submission.submittedAt >= :from AND submission.submittedAt <= :to', { from, to })
        .getCount(),
    ]);

    return {
      periodStart: from.toISOString(),
      periodEnd: to.toISOString(),
      sessions: { total: totalSessions, completed, cancelled, scheduled },
      attendance: { recorded: attendanceRecorded, attended: attendanceAttended },
      homework: { publishedAssignments: assignmentsPublished, submissions },
    };
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (!isAdminRole(user)) {
      throw new ForbiddenException('Administrator access is required for LMS oversight');
    }
  }
}
