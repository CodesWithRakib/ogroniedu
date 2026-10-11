import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { GuardianStudentLinkEntity } from '../../guardians/entities/guardian-student-link.entity';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

/**
 * Ownership / access checks for student learning records: admin bypass,
 * self access, active guardian-link scoping, assigned-tutor booking scoping.
 * Imported by the other learning sub-services; never imports them
 * (keeps the dependency graph acyclic).
 */
@Injectable()
export class LearningAccessService {
  constructor(
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly guardianLinkRepo: Repository<GuardianStudentLinkEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
  ) {}

  /**
   * Helper: Check if an authenticated user is authorized to view a student's learning records
   */
  async assertCanAccessStudentRecords(
    user: AuthenticatedUser,
    studentUserId: string,
    bookingId?: string,
  ): Promise<void> {
    if (user.roles?.includes('admin')) {
      return;
    }

    if (user.id === studentUserId) {
      return;
    }

    // Check active guardian link
    const activeLink = await this.guardianLinkRepo.findOne({
      where: {
        guardianUserId: user.id,
        studentUserId,
        status: 'active',
      },
    });
    if (activeLink) {
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
