import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { TutorReplacementCaseEntity } from '../../trust/entities/tutor-replacement-case.entity';
import { SafetyReportEntity } from '../../trust/entities/safety-report.entity';
import { LedgerService } from '../../payments/ledger.service';

/**
 * Operational dashboard metrics: verification queues, disputes, safety, ledger.
 */
@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(TutorReplacementCaseEntity)
    private readonly replacementCaseRepo: Repository<TutorReplacementCaseEntity>,
    @InjectRepository(SafetyReportEntity)
    private readonly safetyReportRepo: Repository<SafetyReportEntity>,
    private readonly ledgerService: LedgerService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. Operational Dashboard Overview: Metrics across verification queues, disputes, safety, and ledger
   */
  async getOperationalDashboard(): Promise<{
    pendingTutorVerifications: number;
    activeReplacementCases: number;
    openSafetyReports: number;
    activeBookingsCount: number;
    totalRegisteredUsers: number;
    ledgerIntegrity: {
      isBalanced: boolean;
      totalDebits: string;
      totalCredits: string;
      discrepancy: string;
    };
  }> {
    const pendingTutorsRes: Array<{ count: number }> = await this.dataSource.query(
      `SELECT count(*)::int as count FROM tutor_profiles WHERE publication_status = 'pending_review';`,
    );
    const pendingTutors = pendingTutorsRes[0]?.count || 0;

    const activeReplacement = await this.replacementCaseRepo.count({
      where: { status: In(['requested', 'under_review', 'matching']) },
    });

    const openSafety = await this.safetyReportRepo.count({
      where: { status: In(['submitted', 'under_investigation', 'escalated']) },
    });

    const activeBookings = await this.bookingRepo.count({
      where: { status: 'confirmed' },
    });

    const totalUsers = await this.userRepo.count();

    const ledger = await this.ledgerService.verifySystemLedgerIntegrity();

    return {
      pendingTutorVerifications: pendingTutors,
      activeReplacementCases: activeReplacement,
      openSafetyReports: openSafety,
      activeBookingsCount: activeBookings,
      totalRegisteredUsers: totalUsers,
      ledgerIntegrity: {
        isBalanced: ledger.isBalanced,
        totalDebits: ledger.totalDebits.toString(),
        totalCredits: ledger.totalCredits.toString(),
        discrepancy: ledger.discrepancy.toString(),
      },
    };
  }
}
