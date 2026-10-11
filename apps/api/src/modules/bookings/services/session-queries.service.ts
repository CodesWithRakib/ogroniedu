import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { BookingSessionEntity } from '../entities/booking-session.entity';
import { GuardianStudentLinkEntity } from '../../guardians/entities/guardian-student-link.entity';
import { GetSessionsQueryDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

export interface PublicCalendarSlot {
  startsAt: string;
  endsAt: string;
  type: 'busy' | 'available';
}

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
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly linkRepo: Repository<GuardianStudentLinkEntity>,
  ) {}

  /**
   * Ensure user is authorized to manage or view sessions for this booking
   */
  async assertCanManageSessions(
    user: AuthenticatedUser,
    booking: BookingEntity,
  ): Promise<void> {
    if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) {
      return;
    }

    const isDirectParticipant =
      booking.tutorUserId === user.id ||
      booking.requesterUserId === user.id ||
      booking.studentUserId === user.id;

    if (isDirectParticipant) {
      return;
    }

    // Active guardian check
    const activeLink = await this.linkRepo.findOne({
      where: {
        guardianUserId: user.id,
        studentUserId: booking.studentUserId,
        status: 'active',
      },
    });

    if (activeLink) {
      return;
    }

    throw new ForbiddenException(
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
    const guardianLinks = await this.linkRepo.find({
      where: { guardianUserId: user.id, status: 'active' },
    });
    const childIds = guardianLinks.map((l) => l.studentUserId);
    const allowedStudentIds = [user.id, ...childIds];

    const qb = this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.educationLevel', 'educationLevel');

    // Scoped ownership check
    if (!user.roles?.includes('admin') && !user.roles?.includes('super_admin')) {
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
