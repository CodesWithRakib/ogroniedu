import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionAttendanceEntity, AttendanceStatus } from '../entities/session-attendance.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { AuditService } from '../../audit/audit.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { NotificationService } from '../../notifications/notification.service';
import { LearningAccessService } from './learning-access.service';
import { AttendanceSummaryQueryDto, MarkAttendanceDto, StudentScopedListQueryDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { toPageSize } from '../../../common/pagination';
import {
  computeAttendanceMetrics,
  type AttendanceSummaryMetrics,
} from '../utils/learning-metrics';

/** Tutors may correct their own attendance for this long after the session. */
export const ATTENDANCE_EDIT_WINDOW_HOURS = 72;

/** Sessions in these states cannot receive attendance. */
const NON_ATTENDANCE_SESSION_STATUSES: readonly string[] = ['cancelled', 'no_show'];

export interface AttendanceSummary {
  studentId: string;
  bookingId: string | null;
  periodStart: string;
  periodEnd: string;
  sessionsInPeriod: number;
  metrics: AttendanceSummaryMetrics;
}

@Injectable()
export class LearningAttendanceService {
  private readonly logger = new Logger(LearningAttendanceService.name);

  constructor(
    @InjectRepository(SessionAttendanceEntity)
    private readonly attendanceRepo: Repository<SessionAttendanceEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(forwardRef(() => LearningAccessService))
    private readonly access: LearningAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * Record or correct attendance for a session participant.
   * A repeated identical write is a no-op (no audit/no notification), so a
   * retried request cannot duplicate side effects.
   */
  async markAttendance(
    user: AuthenticatedUser,
    dto: MarkAttendanceDto,
    requestId?: string,
  ): Promise<SessionAttendanceEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
      relations: { booking: { subject: true }, studentUser: true },
    });

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    const isTutor = session.tutorUserId === user.id;
    const isAdmin = isAdminRole(user);
    if (!isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can record attendance for this session',
      );
    }

    if (session.status && NON_ATTENDANCE_SESSION_STATUSES.includes(session.status)) {
      throw new BadRequestException(
        `Attendance cannot be recorded for a session in status '${session.status}'`,
      );
    }

    if (session.studentUserId !== dto.participantUserId) {
      throw new BadRequestException('Participant user must match the session student');
    }

    const existing = await this.attendanceRepo.findOne({
      where: {
        sessionId: dto.sessionId,
        participantUserId: dto.participantUserId,
      },
    });

    if (
      existing &&
      existing.attendanceStatus === dto.attendanceStatus &&
      (existing.notes ?? null) === (dto.notes ?? null)
    ) {
      return existing;
    }

    if (existing) {
      const windowEnd = new Date(
        new Date(session.endsAt).getTime() + ATTENDANCE_EDIT_WINDOW_HOURS * 60 * 60 * 1000,
      );
      if (!isAdmin && new Date() > windowEnd) {
        throw new ForbiddenException(
          `Attendance can only be corrected within ${ATTENDANCE_EDIT_WINDOW_HOURS} hours of the session; contact an administrator`,
        );
      }
      if (!dto.correctionReason?.trim()) {
        throw new BadRequestException(
          'correctionReason is required when changing an existing attendance record',
        );
      }

      const previousStatus = existing.attendanceStatus;
      const previousNotes = existing.notes;
      existing.attendanceStatus = dto.attendanceStatus;
      existing.notes = dto.notes ?? null;
      existing.correctionReason = dto.correctionReason.trim();
      existing.recordedBy = user.id;
      existing.recordedAt = new Date();
      existing.updatedAt = new Date();
      const saved = await this.attendanceRepo.save(existing);

      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.attendance_corrected',
        resourceType: 'session_attendance',
        resourceId: saved.id,
        requestId,
        reason: dto.correctionReason,
        safeMetadata: {
          sessionId: dto.sessionId,
          participantUserId: dto.participantUserId,
          previousStatus,
          previousNotes,
          newStatus: dto.attendanceStatus,
        },
      });

      if (previousStatus !== dto.attendanceStatus) {
        await this.notifyAttendance(
          session,
          dto.participantUserId,
          dto.attendanceStatus,
        );
      }
      return saved;
    }

    const record = this.attendanceRepo.create({
      sessionId: dto.sessionId,
      participantUserId: dto.participantUserId,
      attendanceStatus: dto.attendanceStatus,
      recordedBy: user.id,
      notes: dto.notes ?? null,
      correctionReason: null,
    });
    const saved = await this.attendanceRepo.save(record);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.attendance_marked',
      resourceType: 'session_attendance',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        sessionId: dto.sessionId,
        participantUserId: dto.participantUserId,
        attendanceStatus: dto.attendanceStatus,
      },
    });

    await this.notifyAttendance(session, dto.participantUserId, dto.attendanceStatus);
    return saved;
  }

  async getSessionAttendance(
    user: AuthenticatedUser,
    sessionId: string,
  ): Promise<SessionAttendanceEntity[]> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    await this.access.assertCanAccessStudentRecords(user, session.studentUserId, session.bookingId);

    return this.attendanceRepo.find({
      where: { sessionId },
      relations: { participantUser: true, recordedByUser: true },
    });
  }

  /**
   * Attendance summary for a student over a period (defaults: last 90 days).
   * See docs/features/lms/ATTENDANCE_RULES.md for the formula.
   */
  async getAttendanceSummary(
    user: AuthenticatedUser,
    query: AttendanceSummaryQueryDto,
  ): Promise<AttendanceSummary> {
    let studentId = query.studentId;
    let bookingId = query.bookingId ?? null;

    if (bookingId) {
      const booking = await this.access.loadBookingOrFail(bookingId);
      if (studentId && studentId !== booking.studentUserId) {
        throw new BadRequestException('studentId does not match the booking student');
      }
      studentId = booking.studentUserId;
      await this.access.assertCanAccessStudentRecords(user, studentId, booking.id);
    } else if (studentId) {
      await this.access.assertCanAccessStudentRecords(user, studentId);
    } else {
      throw new BadRequestException('studentId or bookingId is required');
    }

    const periodEnd = query.to ? new Date(query.to) : new Date();
    const periodStart = query.from
      ? new Date(query.from)
      : new Date(periodEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (periodStart > periodEnd) {
      throw new BadRequestException('from must be before to');
    }

    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .where('session.studentUserId = :studentId', { studentId })
      .andWhere('session.startsAt >= :periodStart AND session.startsAt <= :periodEnd', {
        periodStart,
        periodEnd,
      })
      .andWhere('session.startsAt <= :now', { now: new Date() })
      .andWhere('session.status NOT IN (:...excluded)', {
        excluded: [...NON_ATTENDANCE_SESSION_STATUSES],
      });
    if (bookingId) qb.andWhere('session.bookingId = :bookingId', { bookingId });

    const sessions = await qb.select(['session.id']).getMany();
    const sessionIds = sessions.map((s) => s.id);

    const rows =
      sessionIds.length > 0
        ? await this.attendanceRepo
            .createQueryBuilder('attendance')
            .where('attendance.participantUserId = :studentId', { studentId })
            .andWhere('attendance.sessionId IN (:...sessionIds)', { sessionIds })
            .getMany()
        : [];

    return {
      studentId,
      bookingId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      sessionsInPeriod: sessionIds.length,
      metrics: computeAttendanceMetrics(
        rows.map((row) => row.attendanceStatus),
        sessionIds.length,
      ),
    };
  }

  /** Offset-paginated attendance history with session context. */
  async getStudentAttendanceHistory(
    user: AuthenticatedUser,
    studentUserId: string,
    query: StudentScopedListQueryDto,
  ) {
    await this.access.assertCanAccessStudentRecords(user, studentUserId, query.bookingId);

    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = toPageSize(query.pageSize);

    const qb = this.attendanceRepo
      .createQueryBuilder('attendance')
      .innerJoinAndSelect('attendance.session', 'session')
      .leftJoinAndSelect('session.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .where('attendance.participantUserId = :studentUserId', { studentUserId })
      .orderBy('session.startsAt', 'DESC')
      .addOrderBy('attendance.id', 'DESC');

    if (query.bookingId) {
      qb.andWhere('session.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    if (query.from) {
      qb.andWhere('session.startsAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('session.startsAt <= :to', { to: new Date(query.to) });
    }

    const [rows, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    return {
      items: rows.map((row) => ({
        id: row.id,
        sessionId: row.sessionId,
        participantUserId: row.participantUserId,
        attendanceStatus: row.attendanceStatus,
        notes: row.notes,
        correctionReason: row.correctionReason,
        recordedAt: new Date(row.recordedAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
        sessionStartsAt: row.session?.startsAt
          ? new Date(row.session.startsAt).toISOString()
          : null,
        subjectName:
          row.session?.booking?.subject?.nameEn ??
          row.session?.booking?.subject?.nameBn ??
          null,
      })),
      totalItems: total,
      page,
      pageSize,
    };
  }

  private async notifyAttendance(
    session: BookingSessionEntity,
    participantUserId: string,
    status: AttendanceStatus,
  ): Promise<void> {
    if (!this.notificationService) return;
    const subjectName = session.booking?.subject?.nameEn || 'Session';
    const studentName = session.studentUser?.displayName || 'Student';
    const payload = {
      sessionId: session.id,
      studentName,
      subjectName,
      status,
    };

    await this.notificationService
      .dispatch({
        userId: participantUserId,
        recipientRole: 'student',
        eventType: 'attendance.marked',
        payload,
      })
      .catch((err) => this.logger.warn(`Failed to dispatch student attendance notification: ${err}`));

    const guardianIds = await this.guardianAccess.findActiveGuardianIds(participantUserId);
    for (const guardianId of guardianIds) {
      await this.notificationService
        .dispatch({
          userId: guardianId,
          recipientRole: 'guardian',
          eventType: 'attendance.marked',
          payload,
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch guardian attendance notification: ${err}`),
        );
    }
  }
}
