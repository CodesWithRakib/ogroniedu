import { Injectable, NotFoundException, Inject, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingSessionEntity } from '../entities/booking-session.entity';
import { GetSessionsQueryDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { isAdminRole } from '../../../common/auth/role.utils';
import type { PublicCalendarSlot } from '../interfaces/public-calendar-slot.interface';

export type { PublicCalendarSlot } from '../interfaces/public-calendar-slot.interface';
export type { BookingParties } from '../../guardians/guardian-access.service';

/**
 * Read-model queries for booking sessions plus the shared
 * participant/admin access-scope helper.
 */
@Injectable()
export class SessionQueriesService {
  constructor(
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
  ) {}

  async assertCanManageSessions(user: AuthenticatedUser, booking: BookingEntity): Promise<void> {
    await this.guardianAccess.assertCanAccessBooking(
      user,
      booking,
      'Access denied: You are not authorized to view or manage sessions for this booking.',
    );
  }

  /**
   * List sessions accessible to the current user. An explicit `studentId`
   * filter is revalidated against active guardian links; cross-child access is
   * a 403, never a silent empty list.
   */
  async getSessions(
    user: AuthenticatedUser,
    query: GetSessionsQueryDto,
  ): Promise<BookingSessionEntity[]> {
    const childIds = await this.guardianAccess.findActiveStudentIds(user.id);
    const allowedStudentIds = [user.id, ...childIds];

    if (query.studentId && !isAdminRole(user)) {
      const allowed = allowedStudentIds.includes(query.studentId);
      if (!allowed) {
        throw new ForbiddenException(
          'Access denied: You are not an active guardian of this student.',
        );
      }
    }

    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'educationLevel')
      .leftJoinAndSelect('session.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndSelect('session.studentUser', 'studentUser');

    if (!isAdminRole(user)) {
      qb.where('(session.tutorUserId = :userId OR session.studentUserId IN (:...studentIds))', {
        userId: user.id,
        studentIds: allowedStudentIds,
      });
    }

    if (query.bookingId) {
      qb.andWhere('session.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    if (query.tutorId) {
      qb.andWhere('session.tutorUserId = :tutorId', { tutorId: query.tutorId });
    }
    if (query.studentId) {
      qb.andWhere('session.studentUserId = :studentId', { studentId: query.studentId });
    }
    if (query.status) {
      qb.andWhere('session.status = :status', { status: query.status });
    }
    if (query.from) {
      qb.andWhere('session.startsAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('session.endsAt <= :to', { to: new Date(query.to) });
    }

    return await qb.orderBy('session.startsAt', 'ASC').getMany();
  }

  async getSessionById(sessionId: string, user: AuthenticatedUser): Promise<BookingSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        booking: {
          subject: true,
          educationLevel: true,
        },
        tutorProfile: {
          user: true,
        },
        studentUser: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (session.booking) {
      await this.assertCanManageSessions(user, session.booking);
    }

    return session;
  }

  async getTutorCalendar(tutorId: string, from: Date, to: Date): Promise<PublicCalendarSlot[]> {
    const activeSessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.tutorUserId = :tutorId', { tutorId })
      .andWhere('s.status IN (:...statuses)', { statuses: ['scheduled', 'in_progress'] })
      .andWhere('s.startsAt < :to AND s.endsAt > :from', { to, from })
      .orderBy('s.startsAt', 'ASC')
      .getMany();

    return activeSessions.map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      type: 'busy' as const,
    }));
  }

  /**
   * RFC 5545 iCalendar generator.
   *
   * Instants are exported in UTC (`...Z`), which is unambiguous and DST-safe.
   * The session timezone is advertised via `X-WR-TIMEZONE` for display.
   * `SEQUENCE` derives from the session `version`, so reschedules/cancellations
   * update existing calendar entries. Meeting URLs are deliberately omitted
   * (they can carry join tokens).
   */
  async generateIcsCalendar(user: AuthenticatedUser, query: GetSessionsQueryDto): Promise<string> {
    const sessions = await this.getSessions(user, query);

    const formatIcsDate = (d: Date): string =>
      d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const escapeIcs = (str: string): string =>
      str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');

    const foldLine = (line: string): string => {
      // RFC 5545: lines SHOULD be no longer than 75 octets. Continuation lines
      // begin with a single space. Fold on UTF-8 byte boundaries.
      const encoder = new TextEncoder();
      if (encoder.encode(line).length <= 75) return line;
      const chunks: string[] = [];
      let current = '';
      let currentBytes = 0;
      for (const char of line) {
        const bytes = encoder.encode(char).length;
        const limit = chunks.length === 0 ? 75 : 74;
        if (currentBytes + bytes > limit) {
          chunks.push(current);
          current = '';
          currentBytes = 0;
        }
        current += char;
        currentBytes += bytes;
      }
      if (current) chunks.push(current);
      return chunks.join('\r\n ');
    };

    const nowStr = formatIcsDate(new Date());
    const timezones = new Set(sessions.map((s) => s.timezone || 'Asia/Dhaka'));

    const events = sessions.map((s) => {
      const subjectName =
        s.booking?.subject?.nameEn || s.booking?.subject?.nameBn || 'Tuition Class';
      const tutorName = s.tutorProfile?.user?.displayName || 'Tutor';
      const starts = formatIcsDate(new Date(s.startsAt));
      const ends = formatIcsDate(new Date(s.endsAt));
      const location = s.locationInstructions || 'Online (OgroniEdu Class)';
      const description =
        `OgroniEdu class\nSubject: ${subjectName}\nTutor: ${tutorName}\n` +
        `Timezone: ${s.timezone}\nJoin from your OgroniEdu dashboard.`;
      const isCancelled = s.status === 'cancelled';
      const updated = formatIcsDate(new Date(s.updatedAt ?? new Date()));

      return [
        'BEGIN:VEVENT',
        `UID:session-${s.id}@ogroniedu.com`,
        `DTSTAMP:${nowStr}`,
        `LAST-MODIFIED:${updated}`,
        `SEQUENCE:${Math.max(0, (s.version ?? 1) - 1)}`,
        `DTSTART:${starts}`,
        `DTEND:${ends}`,
        `SUMMARY:${escapeIcs(`OgroniEdu: ${subjectName} with ${tutorName}`)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        `LOCATION:${escapeIcs(location)}`,
        `STATUS:${isCancelled ? 'CANCELLED' : 'CONFIRMED'}`,
        'TRANSP:OPAQUE',
        'END:VEVENT',
      ]
        .map(foldLine)
        .join('\r\n');
    });

    const calendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OgroniEdu//Tuition Class Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:OgroniEdu Classes',
      `X-WR-TIMEZONE:${[...timezones][0] || 'Asia/Dhaka'}`,
      ...events,
      'END:VCALENDAR',
    ]
      .map(foldLine)
      .join('\r\n');

    return `${calendar}\r\n`;
  }
}
