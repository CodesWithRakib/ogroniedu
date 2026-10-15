import { ForbiddenException, Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { GuardianAccessService } from '../../guardians/guardian-access.service';

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
