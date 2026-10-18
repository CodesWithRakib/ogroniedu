import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationService } from '../../notifications/notification.service';
import type { ReplacementStatus } from '../entities/tutor-replacement-case.entity';

type NotificationRecipientRole = 'guardian' | 'student' | 'tutor' | 'admin' | 'super_admin';

export interface ReplacementNotificationContext {
  caseId: string;
  bookingId: string;
  requestedBy: string;
  studentUserId: string;
  requesterUserId: string;
  assignedTo?: string | null;
}

/**
 * Centralized-notification adapter for replacement cases. Every dispatch uses
 * the existing `tutor.replacement` registry event — no duplicate event type —
 * and only after the business transaction has committed.
 */
@Injectable()
export class TutorReplacementNotifier {
  private readonly logger = new Logger(TutorReplacementNotifier.name);

  constructor(
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  /** Applicant/guardian who owns the case. */
  async notifyOwner(
    context: ReplacementNotificationContext,
    status: ReplacementStatus | 'overdue',
  ): Promise<void> {
    const role: NotificationRecipientRole =
      context.requestedBy === context.requesterUserId &&
      context.requesterUserId !== context.studentUserId
        ? 'guardian'
        : 'student';
    await this.dispatch(context.requestedBy, role, context, status);
  }

  async notifyStudent(
    context: ReplacementNotificationContext,
    status: ReplacementStatus | 'overdue',
  ): Promise<void> {
    if (!context.studentUserId) return;
    await this.dispatch(context.studentUserId, 'student', context, status);
  }

  async notifyTutor(
    tutorUserId: string,
    context: ReplacementNotificationContext,
    status: ReplacementStatus | 'overdue',
  ): Promise<void> {
    await this.dispatch(tutorUserId, 'tutor', context, status);
  }

  /**
   * Notifies the assigned staff member, or every admin/super_admin when the
   * case is unassigned. Bounded by the number of platform operators; a lookup
   * failure is logged and never fails the business operation.
   */
  async notifyStaff(
    context: ReplacementNotificationContext,
    status: ReplacementStatus | 'overdue',
  ): Promise<void> {
    if (context.assignedTo) {
      await this.dispatch(context.assignedTo, 'admin', context, status);
      return;
    }
    const staffIds = await this.findStaffUserIds();
    await Promise.all(staffIds.map((userId) => this.dispatch(userId, 'admin', context, status)));
  }

  private async dispatch(
    userId: string,
    recipientRole: NotificationRecipientRole,
    context: ReplacementNotificationContext,
    status: ReplacementStatus | 'overdue',
  ): Promise<void> {
    try {
      await this.notificationService.dispatch({
        userId,
        recipientRole,
        eventType: 'tutor.replacement',
        payload: {
          caseId: context.caseId,
          bookingId: context.bookingId,
          status,
        },
      });
    } catch (error) {
      // Notifications are best-effort: the case transaction already committed.
      this.logger.warn(
        `Failed to dispatch tutor replacement notification to ${userId}: ${String(error)}`,
      );
    }
  }

  private async findStaffUserIds(): Promise<string[]> {
    if (!this.dataSource) return [];
    try {
      const rows: Array<{ user_id: string }> = await this.dataSource.query(
        `SELECT DISTINCT ur.user_id
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
          WHERE r.code IN ('admin', 'super_admin')
            AND ur.revoked_at IS NULL`,
      );
      return rows.map((row) => row.user_id);
    } catch (error) {
      this.logger.warn(`Failed to resolve replacement staff recipients: ${String(error)}`);
      return [];
    }
  }
}
