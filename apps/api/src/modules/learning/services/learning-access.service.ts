import { ForbiddenException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { GuardianAccessService } from '../../guardians/guardian-access.service';

/** Minimal booking shape needed for learning authorization. */
export interface LearningBookingScope {
  id: string;
  tutorUserId: string;
  studentUserId: string;
  requesterUserId: string;
}

/**
 * Ownership / access checks for student learning records: admin bypass,
 * self access, active guardian-link scoping, assigned-tutor booking scoping.
 * Imported by the other learning sub-services; never imports them
 * (keeps the dependency graph acyclic).
 */
@Injectable()
export class LearningAccessService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
  ) {}

  /** Load a booking or throw 404 (shared by learning authoring services). */
  async loadBookingOrFail(bookingId: string): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    return booking;
  }

  /** True when the caller owns the learning content for this booking (or is admin). */
  isLearningOwner(user: AuthenticatedUser, booking: LearningBookingScope): boolean {
    return isAdminRole(user) || booking.tutorUserId === user.id;
  }

  /**
   * Authoring gate for lesson plans, materials, assignments and goals:
   * only the booking's tutor or a platform admin may write.
   */
  assertCanAuthorLearning(user: AuthenticatedUser, booking: LearningBookingScope): void {
    if (!this.isLearningOwner(user, booking)) {
      throw new ForbiddenException(
        'Only the assigned tutor or an administrator can manage learning content for this booking',
      );
    }
  }

  /**
   * Helper: Check if an authenticated user is authorized to view a student's learning records
   */
  async assertCanAccessStudentRecords(
    user: AuthenticatedUser,
    studentUserId: string,
    bookingId?: string,
  ): Promise<void> {
    if (isAdminRole(user)) {
      return;
    }

    if (user.id === studentUserId) {
      return;
    }

    // Check active guardian link (shared rule home)
    if (await this.guardianAccess.hasActiveLink(user.id, studentUserId)) {
      return;
    }

    // Check if user is an assigned tutor for this student
    if (bookingId) {
      const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
      if (booking && booking.tutorUserId === user.id && booking.studentUserId === studentUserId) {
        return;
      }
    } else {
      const booking = await this.bookingRepo.findOne({
        where: {
          tutorUserId: user.id,
          studentUserId,
        },
      });
      if (booking) {
        return;
      }
    }

    throw new ForbiddenException(
      'Access denied: You are not authorized to view learning records for this student',
    );
  }
}
