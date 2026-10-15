import { Injectable, NotFoundException, Inject } from '@nestjs/common';
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
 * Scheduling and rescheduling services inject this service for
 * authorization checks (one-directional: no cycles).
 */
@Injectable()
export class SessionQueriesService {
  constructor(
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
  ) {}

  /**
   * Ensure user is authorized to manage or view sessions for this booking.
   * Delegates to the shared guardian-access service (single rule home).
   */
  async assertCanManageSessions(user: AuthenticatedUser, booking: BookingEntity): Promise<void> {
    await this.guardianAccess.assertCanAccessBooking(
      user,
      booking,
      'Access denied: You are not authorized to view or manage sessions for this booking.',
    );
  }

  /**
   * List sessions accessible to current user with deterministic filters
   */
  async getSessions(
    user: AuthenticatedUser,
    query: GetSessionsQueryDto,
  ): Promise<BookingSessionEntity[]> {
    // Collect allowed student IDs for guardians
    const childIds = await this.guardianAccess.findActiveStudentIds(user.id);
    const allowedStudentIds = [user.id, ...childIds];

    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'educationLevel');

    // Scoped ownership check
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

  /**
   * Get single session with ownership check
   */
  async getSessionById(sessionId: string, user: AuthenticatedUser): Promise<BookingSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        booking: {
          subject: true,
          educationLevel: true,
        },
        tutorProfile: true,
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

  /**
   * Privacy-safe tutor calendar intervals (student PII completely excluded)
   */
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
}
