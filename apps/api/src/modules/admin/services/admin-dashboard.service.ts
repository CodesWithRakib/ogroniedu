import { Injectable, Inject } from '@nestjs/common';
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
    @Inject(LedgerService)
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
    gmvMinor: string;
    escrowPoolMinor: string;
    verifiedTutorsCount: number;
    activeStudentsCount: number;
    ledgerIntegrity: {
      isBalanced: boolean;
      totalDebits: string;
      totalCredits: string;
      discrepancy: string;
    };
  }> {
    const pendingTutorsRes: Array<{ count: number }> | undefined = await this.dataSource.query(
      `SELECT count(*)::int as count FROM tutor_profiles WHERE publication_status = 'pending_review';`,
    );
    const pendingTutors = pendingTutorsRes?.[0]?.count || 0;

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

    const gmvRes: Array<{ gmv: string }> | undefined = await this.dataSource.query(
      `SELECT coalesce(sum(amount_minor), 0)::text as gmv FROM payment_orders WHERE status = 'succeeded';`,
    );
    const gmvMinor = gmvRes?.[0]?.gmv || '0';

    const escrowRes: Array<{ escrow: string }> | undefined = await this.dataSource.query(
      `SELECT coalesce(sum(amount_minor), 0)::text as escrow FROM payment_orders WHERE status = 'succeeded';`,
    );
    const escrowPoolMinor = escrowRes?.[0]?.escrow || '0';

    const verifiedTutorsRes: Array<{ count: number }> | undefined = await this.dataSource.query(
      `SELECT count(*)::int as count FROM tutor_profiles WHERE verification_status = 'approved' AND publication_status = 'published';`,
    );
    const verifiedTutors = verifiedTutorsRes?.[0]?.count || 0;

    const activeStudentsRes: Array<{ count: number }> | undefined = await this.dataSource.query(
      `SELECT count(*)::int as count FROM student_profiles;`,
    );
    const activeStudents = activeStudentsRes?.[0]?.count || 0;

    const ledger = await this.ledgerService.verifySystemLedgerIntegrity();

    return {
      pendingTutorVerifications: pendingTutors,
      activeReplacementCases: activeReplacement,
      openSafetyReports: openSafety,
      activeBookingsCount: activeBookings,
      totalRegisteredUsers: totalUsers,
      gmvMinor,
      escrowPoolMinor,
      verifiedTutorsCount: verifiedTutors,
      activeStudentsCount: activeStudents,
      ledgerIntegrity: {
        isBalanced: ledger.isBalanced,
        totalDebits: ledger.totalDebits.toString(),
        totalCredits: ledger.totalCredits.toString(),
        discrepancy: ledger.discrepancy.toString(),
      },
    };
  }
}
