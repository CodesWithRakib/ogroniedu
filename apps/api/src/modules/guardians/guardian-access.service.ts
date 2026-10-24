import type { BookingParties } from './interfaces/guardian-access.interfaces';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuardianStudentLinkEntity } from './entities/guardian-student-link.entity';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';

/** Structural booking parties needed for access checks (entity or subset). */
export type { BookingParties } from './interfaces/guardian-access.interfaces';

/**
 * Single home for guardian-link + booking-participant access checks
 * (Phase 23 P2-6). Previously copy-pasted across bookings, session-queries,
 * booking-messages (fan-out), and learning-access with drift risk.
 * Lives in the guardians module (owns the link repo); consumers import
 * GuardiansModule — which itself imports neither bookings, learning, nor
 * notifications, so the graph stays acyclic.
 */
@Injectable()
export class GuardianAccessService {
  constructor(
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly linkRepo: Repository<GuardianStudentLinkEntity>,
  ) {}

  /** True when an active guardian→student link exists. */
  async hasActiveLink(guardianUserId: string, studentUserId: string): Promise<boolean> {
    const link = await this.linkRepo.findOne({
      where: { guardianUserId, studentUserId, status: 'active' },
    });
    return !!link;
  }

  /** Throw Forbidden when no active link exists. */
  async assertActiveLink(
    guardianUserId: string,
    studentUserId: string,
    message = 'Access denied: no active guardian link to this student.',
  ): Promise<void> {
    if (!(await this.hasActiveLink(guardianUserId, studentUserId))) {
      throw new ForbiddenException(message);
    }
  }

  /** Student ids the guardian may act for (active links only). */
  async findActiveStudentIds(guardianUserId: string): Promise<string[]> {
    const links = await this.linkRepo.find({
      where: { guardianUserId, status: 'active' },
    });
    return links.map((l) => l.studentUserId);
  }

  /** Guardian ids watching a student (message fan-out, audit scoping). */
  async findActiveGuardianIds(studentUserId: string): Promise<string[]> {
    const links = await this.linkRepo.find({
      where: { studentUserId, status: 'active' },
    });
    return links.map((l) => l.guardianUserId);
  }

  /**
   * Booking access: direct participant (tutor/requester/student), platform
   * admin, or active guardian of the booking's student — in that order.
   */
  async assertCanAccessBooking(
    user: AuthenticatedUser,
    booking: BookingParties,
    message = 'Access denied: You are not authorized to access this booking.',
  ): Promise<void> {
    if (
      booking.tutorUserId === user.id ||
      booking.requesterUserId === user.id ||
      booking.studentUserId === user.id
    ) {
      return;
    }
    if (isAdminRole(user)) {
      return;
    }
    await this.assertActiveLink(user.id, booking.studentUserId, message);
  }
}
