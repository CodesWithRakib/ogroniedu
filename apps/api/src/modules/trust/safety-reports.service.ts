import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SafetyReportEntity } from './entities/safety-report.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { NotificationService } from '../notifications/notification.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateSafetyReportDto, UpdateSafetyReportDto } from './dto';

@Injectable()
export class SafetyReportsService {
  private readonly logger = new Logger(SafetyReportsService.name);

  constructor(
    @InjectRepository(SafetyReportEntity)
    private readonly reportRepo: Repository<SafetyReportEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 1. Submit Safety or Abuse Report
   * Invariant: High/critical child safety alerts trigger immediate security escalation flag
   */
  async createReport(
    user: AuthenticatedUser,
    dto: CreateSafetyReportDto,
  ): Promise<SafetyReportEntity> {
    const isChildSafety = dto.category === 'child_safety';
    const isCritical = dto.severity === 'critical';
    const isUrgent = isChildSafety || isCritical;

    const escalationLevel = isUrgent ? 'urgent_child_safety' : 'standard';
    const status = isUrgent ? 'escalated' : 'submitted';

    const report = this.reportRepo.create({
      reporterUserId: user.id,
      reportedUserId: dto.reportedUserId || null,
      bookingId: dto.bookingId || null,
      category: dto.category,
      severity: dto.severity || 'medium',
      description: dto.description,
      evidenceAssetIds: dto.evidenceAssetIds || [],
      status,
      escalationLevel,
      policyVersion: 'v1.0-child-safety-reporting',
    });

    const savedReport = await this.reportRepo.save(report);

    // Audit Log
    const auditLog = this.auditRepo.create({
      actorUserId: user.id,
      action: isUrgent ? 'safety.critical_escalated' : 'safety.report_filed',
      resourceType: 'safety_reports',
      resourceId: savedReport.id,
      safeMetadata: {
        category: dto.category,
        severity: dto.severity,
        escalationLevel,
        hasEvidence: (dto.evidenceAssetIds?.length || 0) > 0,
      },
    });
    await this.auditRepo
      .save(auditLog)
      .catch((err) => this.logger.warn(`Failed to persist audit log for safety report: ${err}`));

    // Outbox Event
    const outboxEvent = this.outboxRepo.create({
      eventType: isUrgent ? 'safety.critical_escalation' : 'safety.report_created',
      aggregateType: 'safety_report',
      aggregateId: savedReport.id,
      payload: {
        reportId: savedReport.id,
        category: dto.category,
        severity: dto.severity,
        escalationLevel,
        reporterUserId: user.id,
        reportedUserId: dto.reportedUserId,
      },
    });
    await this.outboxRepo
      .save(outboxEvent)
      .catch((err) => this.logger.warn(`Failed to emit outbox event for safety report: ${err}`));

    if (isUrgent) {
      this.logger.warn(
        `CRITICAL CHILD SAFETY ALERT [Report: ${savedReport.id}]: Category: ${dto.category}, Severity: ${dto.severity}`,
      );
    }

    return savedReport;
  }

  /**
   * 2. Get Safety Report (ABAC Scoped: Reporter or Admin only)
   * Invariant: Reported users or unrelated users CANNOT see confidential reports or evidence
   */
  async getReport(user: AuthenticatedUser, reportId: string): Promise<SafetyReportEntity> {
    const report = await this.reportRepo.findOne({
      where: { id: reportId },
      relations: { reporter: true, reportedUser: true },
    });

    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    const isReporter = user.id === report.reporterUserId;
    const isAdmin = user.roles?.includes('admin');

    if (!isReporter && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this confidential safety report',
      );
    }

    return report;
  }

  /**
   * 3. List Reports (Admin Queue or Reporter History)
   */
  async listReports(user: AuthenticatedUser): Promise<SafetyReportEntity[]> {
    const isAdmin = user.roles?.includes('admin');
    const where: any = isAdmin ? {} : { reporterUserId: user.id };

    return this.reportRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 4. Update Report Status (Admin only)
   */
  async updateReport(
    user: AuthenticatedUser,
    reportId: string,
    dto: UpdateSafetyReportDto,
  ): Promise<SafetyReportEntity> {
    if (!user.roles?.includes('admin')) {
      throw new ForbiddenException(
        'Admin privileges required to update safety report investigation status',
      );
    }

    const report = await this.reportRepo.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    if (dto.status) {
      report.status = dto.status;
    }
    if (dto.escalationLevel) {
      report.escalationLevel = dto.escalationLevel;
    }
    if (dto.resolutionNotes) {
      report.resolutionNotes = dto.resolutionNotes;
      report.resolvedBy = user.id;
      report.resolvedAt = new Date();
    }

    const updated = await this.reportRepo.save(report);

    // Audit Log
    await this.auditRepo
      .save(
        this.auditRepo.create({
          actorUserId: user.id,
          action: 'safety.status_updated',
          resourceType: 'safety_reports',
          resourceId: report.id,
          reason: dto.resolutionNotes || 'Investigation status update',
          safeMetadata: { status: report.status, escalationLevel: report.escalationLevel },
        }),
      )
      .catch((err) => this.logger.warn(`Failed to persist audit log for report update: ${err}`));

    return updated;
  }
}
