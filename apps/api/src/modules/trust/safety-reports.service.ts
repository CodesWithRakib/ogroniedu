import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, type FindOptionsWhere } from 'typeorm';
import {
  SafetyReportEntity,
  type SafetyCategory,
  type SafetySeverity,
  type SafetyStatus,
  type EscalationLevel,
} from './entities/safety-report.entity';
import { SafetyCaseMessageEntity } from './entities/safety-case-message.entity';
import { SafetyCaseEventEntity } from './entities/safety-case-event.entity';
import { SafetyActionEntity } from './entities/safety-action.entity';
import { TutorProfileEntity } from '../tutors/entities/tutor-profile.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditLogEntity } from '../audit/entities/audit-log.entity';
import { NotificationService } from '../notifications/notification.service';
import { FilesService } from '../files/files.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';
import {
  CreateSafetyReportDto,
  UpdateSafetyReportDto,
  AssignCaseDto,
  CreateCaseMessageDto,
  ApplySafetyActionDto,
  RevokeSafetyActionDto,
  ResolveSafetyCaseDto,
  UpdateCaseStatusDto,
} from './dto';

export function isStaffRole(user: AuthenticatedUser | undefined): boolean {
  if (!user) return false;
  if (isAdminRole(user)) return true;
  return !!user.roles?.some((r) => r === 'compliance_reviewer');
}

export function isSupportAgent(user: AuthenticatedUser | undefined): boolean {
  return !!user?.roles?.includes('support_agent');
}

const CRITICAL_CATEGORIES: ReadonlyArray<SafetyCategory> = [
  'abuse_exploitation',
  'physical_safety',
  'child_safety',
];

const NON_SENSITIVE_CATEGORIES: ReadonlyArray<SafetyCategory> = [
  'general_complaint',
  'booking_dispute',
  'payment_refund',
  'other',
];

@Injectable()
export class SafetyReportsService {
  private readonly logger = new Logger(SafetyReportsService.name);

  constructor(
    @InjectRepository(SafetyReportEntity)
    private readonly reportRepo: Repository<SafetyReportEntity>,
    @InjectRepository(SafetyCaseMessageEntity)
    private readonly messageRepo: Repository<SafetyCaseMessageEntity>,
    @InjectRepository(SafetyCaseEventEntity)
    private readonly eventRepo: Repository<SafetyCaseEventEntity>,
    @InjectRepository(SafetyActionEntity)
    private readonly actionRepo: Repository<SafetyActionEntity>,
    @InjectRepository(TutorProfileEntity)
    private readonly tutorProfileRepo: Repository<TutorProfileEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
    @Inject(FilesService)
    private readonly filesService: FilesService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. Submit Safety or Abuse Report
   * Invariant: High/critical child safety alerts trigger immediate security escalation flag
   */
  async createReport(
    user: AuthenticatedUser,
    dto: CreateSafetyReportDto,
  ): Promise<SafetyReportEntity> {
    const isCriticalCategory = CRITICAL_CATEGORIES.includes(dto.category);
    const isCriticalSeverity = dto.severity === 'critical';
    const isUrgent = isCriticalCategory || isCriticalSeverity;

    const escalationLevel: EscalationLevel = isUrgent ? 'urgent_child_safety' : 'standard';
    const status: SafetyStatus = isUrgent ? 'escalated' : 'submitted';
    const severity: SafetySeverity = isCriticalCategory ? 'critical' : dto.severity || 'medium';

    return this.dataSource.transaction(async (manager) => {
      const report = manager.create(SafetyReportEntity, {
        reporterUserId: user.id,
        reportedUserId: dto.reportedUserId || null,
        bookingId: dto.bookingId || null,
        sessionId: dto.sessionId || null,
        category: dto.category,
        severity,
        description: dto.description,
        evidenceAssetIds: dto.evidenceAssetIds || [],
        status,
        escalationLevel,
        isConfidential: dto.isConfidential !== undefined ? dto.isConfidential : true,
        preferredContactMethod: dto.preferredContactMethod || 'in_app',
        incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : null,
        conflictUserIds: dto.reportedUserId ? [dto.reportedUserId] : [],
        policyVersion: 'v1.0-child-safety-reporting',
      });

      const savedReport = await manager.save(SafetyReportEntity, report);

      // 1. Initial Lifecycle Event
      const initialEvent = manager.create(SafetyCaseEventEntity, {
        reportId: savedReport.id,
        actorId: user.id,
        eventType: 'submitted',
        fromStatus: null,
        toStatus: savedReport.status,
        reason: isUrgent
          ? 'Initial submission with urgent safeguarding escalation'
          : 'Initial submission',
        metadata: {
          category: dto.category,
          severity,
          isUrgent,
        },
      });
      await manager.save(SafetyCaseEventEntity, initialEvent);

      // 2. Audit Log
      const auditLog = this.auditRepo.create({
        actorUserId: user.id,
        action: isUrgent ? 'safety.critical_escalated' : 'safety.report_filed',
        resourceType: 'safety_reports',
        resourceId: savedReport.id,
        safeMetadata: {
          category: dto.category,
          severity,
          escalationLevel,
          hasEvidence: (dto.evidenceAssetIds?.length || 0) > 0,
        },
      });
      await this.auditRepo
        .save(auditLog)
        .catch((err) => this.logger.warn(`Failed to persist audit log: ${err}`));

      // 3. Outbox Event
      const outboxEvent = this.outboxRepo.create({
        eventType: isUrgent ? 'safety.critical_escalation' : 'case.submitted',
        aggregateType: 'safety_report',
        aggregateId: savedReport.id,
        payload: {
          caseId: savedReport.id,
          category: dto.category,
          severity,
          escalationLevel,
          reporterUserId: user.id,
          reportedUserId: dto.reportedUserId,
        },
      });
      await this.outboxRepo
        .save(outboxEvent)
        .catch((err) => this.logger.warn(`Failed to emit outbox event: ${err}`));

      if (isUrgent) {
        this.logger.warn(
          `CRITICAL CHILD SAFETY ALERT [Report: ${savedReport.id}]: Category: ${dto.category}, Severity: ${severity}`,
        );
      }

      // 4. Centralized Notification Dispatch (generic non-revealing wording)
      await this.notificationService
        .dispatch({
          userId: user.id,
          recipientRole:
            (user.roles?.find((r) =>
              [
                'student',
                'guardian',
                'tutor',
                'admin',
                'super_admin',
                'compliance_reviewer',
              ].includes(r),
            ) as
              'student' | 'guardian' | 'tutor' | 'admin' | 'super_admin' | 'compliance_reviewer') ||
            'student',
          eventType: 'case.submitted',
          payload: { caseId: savedReport.id },
        })
        .catch((err) => this.logger.warn(`Failed to dispatch case.submitted notification: ${err}`));

      return savedReport;
    });
  }

  /**
   * 2. Get Safety Report (Strict ABAC Scoping)
   * Invariants:
   *  - Accused user is strictly forbidden (HTTP 403)
   *  - Students cannot view other students' reports
   *  - Guardians cannot see confidential reports filed by minor
   *  - Support agents cannot view unassigned sensitive cases
   *  - Internal investigator notes are masked from non-staff
   */
  async getReport(user: AuthenticatedUser, reportId: string): Promise<SafetyReportEntity> {
    const report = await this.reportRepo.findOne({
      where: { id: reportId },
      relations: {
        reporter: true,
        reportedUser: true,
        assignedInvestigator: true,
        resolver: true,
        messages: { sender: true },
        events: { actor: true },
        actions: { appliedByUser: true },
      },
    });

    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    // Rule 1: Accused party strictly blocked
    if (user.id === report.reportedUserId) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this confidential safety report',
      );
    }

    const isReporter = user.id === report.reporterUserId;
    const isStaff = isStaffRole(user);
    const isAssigned = report.assignedTo === user.id;

    // Rule 2: Student scoping
    if (user.roles?.includes('student') && !isReporter) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this confidential safety report',
      );
    }

    // Rule 3: Guardian confidentiality rule
    if (user.roles?.includes('guardian') && !isReporter) {
      if (report.isConfidential) {
        throw new ForbiddenException(
          'Access denied: This report is confidential and protected under child privacy policy',
        );
      }
    }

    // Rule 4: Support agent scoping
    if (isSupportAgent(user) && !isStaff && !isAssigned) {
      const isNonSensitive = NON_SENSITIVE_CATEGORIES.includes(report.category);
      if (!isNonSensitive) {
        throw new ForbiddenException(
          'Access denied: Sensitive safeguarding cases require compliance reviewer authorization',
        );
      }
    }

    // Rule 5: Organization owner / general user scoping
    if (!isReporter && !isStaff && !isAssigned && !isSupportAgent(user)) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this confidential safety report',
      );
    }

    // Mask internal notes if caller is not staff/assigned
    if (!isStaff && !isAssigned && report.messages) {
      report.messages = report.messages.filter((m) => !m.isInternalNote);
    }

    return report;
  }

  /**
   * 3. List Reports (Filtered by ABAC)
   */
  async listReports(
    user: AuthenticatedUser,
    query?: { status?: SafetyStatus; category?: SafetyCategory; priority?: string },
  ): Promise<SafetyReportEntity[]> {
    const isStaff = isStaffRole(user);
    const isAssignedAgent = isSupportAgent(user);

    if (isStaff) {
      const qb = this.reportRepo
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.reporter', 'reporter')
        .leftJoinAndSelect('report.reportedUser', 'reportedUser')
        .leftJoinAndSelect('report.assignedInvestigator', 'assignedInvestigator')
        // Accused staff cannot view reports filed against themselves
        .where('report.reported_user_id IS NULL OR report.reported_user_id != :userId', {
          userId: user.id,
        });

      if (query?.status) {
        qb.andWhere('report.status = :status', { status: query.status });
      }
      if (query?.category) {
        qb.andWhere('report.category = :category', { category: query.category });
      }

      return qb.orderBy('report.created_at', 'DESC').getMany();
    }

    if (isAssignedAgent) {
      // Support agents see their assigned cases OR non-sensitive categories
      const qb = this.reportRepo
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.reporter', 'reporter')
        .where('report.reported_user_id IS NULL OR report.reported_user_id != :userId', {
          userId: user.id,
        })
        .andWhere('(report.assigned_to = :userId OR report.category IN (:...nonSensitive))', {
          userId: user.id,
          nonSensitive: NON_SENSITIVE_CATEGORIES,
        });

      return qb.orderBy('report.created_at', 'DESC').getMany();
    }

    // Regular users see only their own submitted cases
    const where: FindOptionsWhere<SafetyReportEntity> = { reporterUserId: user.id };
    return this.reportRepo.find({
      where,
      relations: { reportedUser: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 4. Assign or Reassign Case (with Conflict of Interest Prevention)
   */
  async assignCase(
    user: AuthenticatedUser,
    reportId: string,
    dto: AssignCaseDto,
  ): Promise<SafetyReportEntity> {
    if (!isStaffRole(user)) {
      throw new ForbiddenException(
        'Compliance reviewer or admin privileges required to assign cases',
      );
    }

    const report = await this.reportRepo.findOne({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    // Conflict of Interest: Caller cannot assign if caller is implicated
    if (user.id === report.reportedUserId) {
      throw new ForbiddenException(
        'Conflict of interest: Implicated user cannot perform case assignment',
      );
    }

    // Conflict of Interest: Target investigator cannot be implicated
    if (
      dto.assignedTo === report.reportedUserId ||
      report.conflictUserIds?.includes(dto.assignedTo)
    ) {
      throw new ConflictException(
        'Conflict of interest: Implicated user cannot be assigned as case investigator',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const oldAssignee = report.assignedTo;
      report.assignedTo = dto.assignedTo;
      if (report.status === 'submitted' || report.status === 'triaged') {
        report.status = 'assigned';
      }

      const updated = await manager.save(SafetyReportEntity, report);

      const event = manager.create(SafetyCaseEventEntity, {
        reportId: report.id,
        actorId: user.id,
        eventType: oldAssignee ? 'reassigned' : 'assigned',
        reason: dto.reason || 'Investigator assigned',
        metadata: {
          assignedTo: dto.assignedTo,
          previousAssignee: oldAssignee,
        },
      });
      await manager.save(SafetyCaseEventEntity, event);

      // Audit Log
      await manager.save(
        AuditLogEntity,
        manager.create(AuditLogEntity, {
          actorUserId: user.id,
          action: 'safety.case_assigned',
          resourceType: 'safety_reports',
          resourceId: report.id,
          safeMetadata: { assignedTo: dto.assignedTo, oldAssignee },
        }),
      );

      // Notify new assignee
      await this.notificationService
        .dispatch({
          userId: dto.assignedTo,
          recipientRole: 'admin',
          eventType: 'case.assigned',
          payload: { caseId: report.id },
        })
        .catch((err) => this.logger.warn(`Failed to dispatch case.assigned notification: ${err}`));

      return updated;
    });
  }

  /**
   * 5. Update Report Lifecycle Status (with Durable Event Commit)
   */
  async updateCaseStatus(
    user: AuthenticatedUser,
    reportId: string,
    dto: UpdateCaseStatusDto,
  ): Promise<SafetyReportEntity> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    const isStaff = isStaffRole(user);
    const isAssigned = report.assignedTo === user.id;

    if (!isStaff && !isAssigned) {
      throw new ForbiddenException(
        'Only assigned investigators or compliance staff may update case status',
      );
    }

    if (user.id === report.reportedUserId) {
      throw new ForbiddenException(
        'Conflict of interest: Implicated user cannot update case state',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = report.status;
      report.status = dto.status;
      const updated = await manager.save(SafetyReportEntity, report);

      const event = manager.create(SafetyCaseEventEntity, {
        reportId: report.id,
        actorId: user.id,
        eventType: 'status_changed',
        fromStatus,
        toStatus: dto.status,
        reason: dto.reason || 'Case status transition',
        metadata: { fromStatus, toStatus: dto.status },
      });
      await manager.save(SafetyCaseEventEntity, event);

      await manager.save(
        AuditLogEntity,
        manager.create(AuditLogEntity, {
          actorUserId: user.id,
          action: 'safety.status_updated',
          resourceType: 'safety_reports',
          resourceId: report.id,
          reason: dto.reason || 'Status update',
          safeMetadata: { fromStatus, toStatus: dto.status },
        }),
      );

      return updated;
    });
  }

  /**
   * 6. Add Case Message (Reporter Visible vs Internal Investigator Note)
   */
  async addCaseMessage(
    user: AuthenticatedUser,
    reportId: string,
    dto: CreateCaseMessageDto,
  ): Promise<SafetyCaseMessageEntity> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    if (user.id === report.reportedUserId) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to participate in this case thread',
      );
    }

    const isStaff = isStaffRole(user);
    const isReporter = user.id === report.reporterUserId;
    const isAssigned = report.assignedTo === user.id;

    if (!isStaff && !isReporter && !isAssigned) {
      throw new ForbiddenException('Access denied: You are not authorized to post in this case');
    }

    // Invariant: Non-staff reporters cannot create internal notes
    if (dto.isInternalNote && !isStaff && !isAssigned) {
      throw new ForbiddenException(
        'Only authorized review staff may create internal investigator notes',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const msg = manager.create(SafetyCaseMessageEntity, {
        reportId: report.id,
        senderId: user.id,
        message: dto.message,
        isInternalNote: dto.isInternalNote || false,
        attachmentAssetIds: dto.attachmentAssetIds || [],
      });

      const savedMessage = await manager.save(SafetyCaseMessageEntity, msg);

      // Status side-effect
      if (dto.isInternalNote) {
        // Internal note: does not change reporter interaction state
      } else if (isStaff || isAssigned) {
        // Staff asked reporter for info -> update status
        report.status = 'awaiting_information';
        await manager.save(SafetyReportEntity, report);

        // Notify reporter
        await this.notificationService
          .dispatch({
            userId: report.reporterUserId,
            recipientRole: 'student',
            eventType: 'case.information_requested',
            payload: { caseId: report.id },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch information request notice: ${err}`),
          );
      } else if (isReporter && report.status === 'awaiting_information') {
        // Reporter replied -> return to under_review
        report.status = 'under_review';
        await manager.save(SafetyReportEntity, report);
      }

      // Event
      const event = manager.create(SafetyCaseEventEntity, {
        reportId: report.id,
        actorId: user.id,
        eventType: dto.isInternalNote ? 'information_requested' : 'information_provided',
        reason: dto.isInternalNote ? 'Internal investigator note added' : 'Case message added',
        metadata: {
          messageId: savedMessage.id,
          isInternalNote: dto.isInternalNote,
        },
      });
      await manager.save(SafetyCaseEventEntity, event);

      return savedMessage;
    });
  }

  /**
   * 7. Apply Immediate Safety Action (Hold, Contact Restriction, Suspension)
   */
  async applySafetyAction(
    user: AuthenticatedUser,
    reportId: string,
    dto: ApplySafetyActionDto,
  ): Promise<SafetyActionEntity> {
    if (!isStaffRole(user)) {
      throw new ForbiddenException(
        'Compliance reviewer or admin privileges required to apply safety actions',
      );
    }

    if (user.id === dto.targetUserId) {
      throw new ForbiddenException('Conflict of interest: Cannot apply safety action to yourself');
    }

    return this.dataSource.transaction(async (manager) => {
      const action = manager.create(SafetyActionEntity, {
        reportId,
        targetUserId: dto.targetUserId,
        actionType: dto.actionType,
        reason: dto.reason,
        appliedBy: user.id,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      });

      const savedAction = await manager.save(SafetyActionEntity, action);

      // Execute side-effect if tutor safety hold
      if (dto.actionType === 'tutor_safety_hold') {
        const tutorProfile = await manager.findOne(TutorProfileEntity, {
          where: { userId: dto.targetUserId },
        });
        if (tutorProfile) {
          tutorProfile.safetyHoldStatus = 'safety_hold';
          tutorProfile.safetyHoldReason = dto.reason;
          tutorProfile.publicationStatus = 'unpublished';
          await manager.save(TutorProfileEntity, tutorProfile);
        }
      }

      if (reportId) {
        const rep = await manager.findOne(SafetyReportEntity, { where: { id: reportId } });
        if (rep) {
          rep.status = 'action_taken';
          await manager.save(SafetyReportEntity, rep);
        }
      }

      // Record event
      const event = manager.create(SafetyCaseEventEntity, {
        reportId,
        actorId: user.id,
        eventType: 'safety_action_applied',
        reason: dto.reason,
        metadata: {
          actionId: savedAction.id,
          actionType: dto.actionType,
          targetUserId: dto.targetUserId,
        },
      });
      await manager.save(SafetyCaseEventEntity, event);

      // Audit Log
      await manager.save(
        AuditLogEntity,
        manager.create(AuditLogEntity, {
          actorUserId: user.id,
          action: 'safety.action_applied',
          resourceType: 'safety_actions',
          resourceId: savedAction.id,
          reason: dto.reason,
          safeMetadata: { actionType: dto.actionType, targetUserId: dto.targetUserId },
        }),
      );

      this.logger.warn(
        `SAFETY ACTION ${dto.actionType} APPLIED to user ${dto.targetUserId} by admin ${user.id}`,
      );

      return savedAction;
    });
  }

  /**
   * 8. Revoke Safety Action
   */
  async revokeSafetyAction(
    user: AuthenticatedUser,
    actionId: string,
    dto: RevokeSafetyActionDto,
  ): Promise<SafetyActionEntity> {
    if (!isStaffRole(user)) {
      throw new ForbiddenException(
        'Compliance reviewer or admin privileges required to revoke safety actions',
      );
    }

    const action = await this.actionRepo.findOne({ where: { id: actionId } });
    if (!action) {
      throw new NotFoundException(`Safety action ${actionId} not found`);
    }

    return this.dataSource.transaction(async (manager) => {
      action.revokedAt = new Date();
      action.revokedBy = user.id;
      action.revocationReason = dto.revocationReason;

      const updated = await manager.save(SafetyActionEntity, action);

      // Restore tutor hold if applicable
      if (action.actionType === 'tutor_safety_hold') {
        const tutorProfile = await manager.findOne(TutorProfileEntity, {
          where: { userId: action.targetUserId },
        });
        if (tutorProfile) {
          tutorProfile.safetyHoldStatus = 'clear';
          tutorProfile.safetyHoldReason = null;
          await manager.save(TutorProfileEntity, tutorProfile);
        }
      }

      if (action.reportId) {
        const event = manager.create(SafetyCaseEventEntity, {
          reportId: action.reportId,
          actorId: user.id,
          eventType: 'safety_action_revoked',
          reason: dto.revocationReason,
          metadata: { actionId, actionType: action.actionType },
        });
        await manager.save(SafetyCaseEventEntity, event);
      }

      return updated;
    });
  }

  /**
   * 9. Resolve Safety Case (Findings & Documented Outcomes)
   */
  async resolveCase(
    user: AuthenticatedUser,
    reportId: string,
    dto: ResolveSafetyCaseDto,
  ): Promise<SafetyReportEntity> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    const isStaff = isStaffRole(user);
    const isAssigned = report.assignedTo === user.id;

    if (!isStaff && !isAssigned) {
      throw new ForbiddenException(
        'Only assigned investigators or compliance staff may resolve cases',
      );
    }

    if (user.id === report.reportedUserId) {
      throw new ForbiddenException('Conflict of interest: Implicated user cannot resolve case');
    }

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = report.status;
      report.status = dto.status || 'resolved';
      report.resolutionNotes = dto.resolutionNotes;
      report.resolvedBy = user.id;
      report.resolvedAt = new Date();

      const updated = await manager.save(SafetyReportEntity, report);

      const event = manager.create(SafetyCaseEventEntity, {
        reportId: report.id,
        actorId: user.id,
        eventType: 'resolved',
        fromStatus,
        toStatus: report.status,
        reason: dto.resolutionNotes,
        metadata: { outcomeType: dto.outcomeType },
      });
      await manager.save(SafetyCaseEventEntity, event);

      // Audit Log
      await manager.save(
        AuditLogEntity,
        manager.create(AuditLogEntity, {
          actorUserId: user.id,
          action: 'safety.case_resolved',
          resourceType: 'safety_reports',
          resourceId: report.id,
          reason: dto.resolutionNotes,
          safeMetadata: { outcomeType: dto.outcomeType },
        }),
      );

      // Notify reporter (generic message)
      await this.notificationService
        .dispatch({
          userId: report.reporterUserId,
          recipientRole: 'student',
          eventType: 'case.resolved',
          payload: { caseId: report.id },
        })
        .catch((err) => this.logger.warn(`Failed to dispatch case.resolved notice: ${err}`));

      return updated;
    });
  }

  /**
   * 10. Reopen Closed or Resolved Case
   */
  async reopenCase(
    user: AuthenticatedUser,
    reportId: string,
    reason: string,
  ): Promise<SafetyReportEntity> {
    if (!isStaffRole(user)) {
      throw new ForbiddenException(
        'Compliance reviewer or admin privileges required to reopen cases',
      );
    }

    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    if (!['resolved', 'closed', 'dismissed', 'action_taken'].includes(report.status)) {
      throw new BadRequestException(
        `Cannot reopen case in current active status (${report.status})`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const fromStatus = report.status;
      report.status = 'reopened';

      const updated = await manager.save(SafetyReportEntity, report);

      const event = manager.create(SafetyCaseEventEntity, {
        reportId: report.id,
        actorId: user.id,
        eventType: 'reopened',
        fromStatus,
        toStatus: 'reopened',
        reason,
      });
      await manager.save(SafetyCaseEventEntity, event);

      return updated;
    });
  }

  /**
   * 11. Access-Controlled Evidence Retrieval (Audited)
   * Invariants:
   *  - Accused user is strictly forbidden (HTTP 403)
   *  - Attachment must belong to case
   *  - Access is logged in immutable safety_case_events
   */
  async getEvidenceAccess(
    user: AuthenticatedUser,
    reportId: string,
    assetId: string,
  ): Promise<{ file: unknown; signedUrl: string; expiresAt: string }> {
    const report = await this.reportRepo.findOne({
      where: { id: reportId },
      relations: { messages: true },
    });
    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    // Accused party blocked
    if (user.id === report.reportedUserId) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view evidence on this report',
      );
    }

    // Verify attachment belongs to this case
    const isReportEvidence = report.evidenceAssetIds?.includes(assetId);
    const isMessageEvidence = report.messages?.some((m) => m.attachmentAssetIds?.includes(assetId));

    if (!isReportEvidence && !isMessageEvidence) {
      throw new ForbiddenException('Attachment does not belong to this case');
    }

    const isReporter = user.id === report.reporterUserId;
    const isStaff = isStaffRole(user);
    const isAssigned = report.assignedTo === user.id;

    if (!isReporter && !isStaff && !isAssigned) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to download this case evidence',
      );
    }

    // Record audit event
    const event = this.eventRepo.create({
      reportId: report.id,
      actorId: user.id,
      eventType: 'evidence_accessed',
      metadata: { assetId },
    });
    await this.eventRepo.save(event);

    return this.filesService.issueSignedAccess(assetId, user.id, 300);
  }

  /**
   * 12. Backward Compatibility: Legacy updateReport
   */
  async updateReport(
    user: AuthenticatedUser,
    reportId: string,
    dto: UpdateSafetyReportDto,
  ): Promise<SafetyReportEntity> {
    if (!isAdminRole(user)) {
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
      report.status = dto.status as SafetyStatus;
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

  /**
   * 13. Backward Compatibility: Legacy applyProtectiveHold
   */
  async applyProtectiveHold(
    user: AuthenticatedUser,
    reportId: string,
    reason: string,
  ): Promise<SafetyReportEntity> {
    if (!isAdminRole(user)) {
      throw new ForbiddenException('Admin privileges required to apply protective safety holds');
    }

    const report = await this.reportRepo.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    if (!report.reportedUserId) {
      throw new BadRequestException(
        'Cannot apply safety hold: no reported tutor user ID is associated with this report',
      );
    }

    const tutorProfile = await this.tutorProfileRepo.findOne({
      where: { userId: report.reportedUserId },
    });

    if (tutorProfile) {
      tutorProfile.safetyHoldStatus = 'safety_hold';
      tutorProfile.safetyHoldReason = reason;
      tutorProfile.publicationStatus = 'unpublished';
      await this.tutorProfileRepo.save(tutorProfile);
    }

    report.status = 'action_taken';
    report.resolutionNotes = `Protective safety hold applied: ${reason}`;
    report.resolvedBy = user.id;
    report.resolvedAt = new Date();
    const updated = await this.reportRepo.save(report);

    await this.actionRepo.save(
      this.actionRepo.create({
        reportId,
        targetUserId: report.reportedUserId,
        actionType: 'tutor_safety_hold',
        reason,
        appliedBy: user.id,
      }),
    );

    // Audit log
    await this.auditRepo
      .save(
        this.auditRepo.create({
          actorUserId: user.id,
          action: 'safety.protective_hold_applied',
          resourceType: 'tutor_profiles',
          resourceId: report.reportedUserId,
          reason,
          safeMetadata: { reportId: report.id },
        }),
      )
      .catch((err) => this.logger.warn(`Failed to log protective hold: ${err}`));

    this.logger.warn(
      `PROTECTIVE SAFETY HOLD APPLIED to tutor ${report.reportedUserId} by admin ${user.id}`,
    );

    return updated;
  }

  /**
   * 14. Backward Compatibility: Legacy removeProtectiveHold
   */
  async removeProtectiveHold(
    user: AuthenticatedUser,
    reportId: string,
  ): Promise<SafetyReportEntity> {
    if (!isAdminRole(user)) {
      throw new ForbiddenException('Admin privileges required to remove protective safety holds');
    }

    const report = await this.reportRepo.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Safety report ${reportId} not found`);
    }

    if (report.reportedUserId) {
      const tutorProfile = await this.tutorProfileRepo.findOne({
        where: { userId: report.reportedUserId },
      });

      if (tutorProfile) {
        tutorProfile.safetyHoldStatus = 'clear';
        tutorProfile.safetyHoldReason = null;
        await this.tutorProfileRepo.save(tutorProfile);
      }
    }

    report.resolutionNotes = `${report.resolutionNotes || ''} [Safety hold cleared by admin ${user.id}]`;
    const updated = await this.reportRepo.save(report);

    // Audit log
    await this.auditRepo
      .save(
        this.auditRepo.create({
          actorUserId: user.id,
          action: 'safety.protective_hold_removed',
          resourceType: 'tutor_profiles',
          resourceId: report.reportedUserId || report.id,
          safeMetadata: { reportId: report.id },
        }),
      )
      .catch((err) => this.logger.warn(`Failed to log protective hold release: ${err}`));

    return updated;
  }
}
