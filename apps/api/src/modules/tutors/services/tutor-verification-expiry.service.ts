import type { VerificationExpirySweepResult } from '../interfaces/tutor-verification-expiry.interfaces';
import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { TUTOR_VERIFICATION_POLICY, type TutorVerificationLevel } from '@ogroniedu/contracts';
import { TutorVerificationLevelEntity } from '../entities/tutor-verification-level.entity';
import { TutorVerificationDocumentEntity } from '../entities/tutor-verification-document.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import {
  VERIFICATION_REMINDER_OFFSETS_DAYS,
  VERIFICATION_SWEEP_BATCH_SIZE,
} from '../constants/verification-policy.constants';
import { TUTOR_VERIFICATION_POLICY_VERSION } from '../constants/tutor.constants';
import { TutorVerificationStatusService } from './tutor-verification-status.service';

export type { VerificationExpirySweepResult } from '../interfaces/tutor-verification-expiry.interfaces';

const MS_PER_DAY = 86_400_000;

/**
 * UTC calendar-day distance between an ISO date and the reference instant.
 * Calendar maths is done in UTC so the comparison never drifts by a day across
 * timezone/DST boundaries.
 */
export function utcDaysUntil(isoDate: string, now: Date): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const expiryUtc = Date.UTC(year, (month ?? 1) - 1, day ?? 1);
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((expiryUtc - todayUtc) / MS_PER_DAY);
}

/** Reminder stage for a document, or null when it is outside the reminder window. */
export function resolveReminderStage(daysUntilExpiry: number): string | null {
  if (daysUntilExpiry < 0) return 'EXPIRED';
  const offsets = [...VERIFICATION_REMINDER_OFFSETS_DAYS].sort((a, b) => a - b);
  for (const offset of offsets) {
    if (daysUntilExpiry <= offset) return `D-${offset}`;
  }
  return null;
}

/**
 * Scheduled verification maintenance.
 *
 * `sweep(now)` is deterministic (the clock is a parameter, so tests do not need
 * fake timers), idempotent (a second run with the same clock performs no state
 * change and sends no duplicate reminder) and safe to run concurrently — every
 * state change is guarded by the previous status.
 *
 * Scheduling contract: run once per day from the platform scheduler/worker, or
 * on demand through the admin operations endpoint. See
 * `docs/features/tutor-verification/OPERATIONS.md`.
 */
@Injectable()
export class TutorVerificationExpiryService {
  private readonly logger = new Logger(TutorVerificationExpiryService.name);

  constructor(
    @InjectRepository(TutorVerificationLevelEntity)
    private readonly levelRepo: Repository<TutorVerificationLevelEntity>,
    @InjectRepository(TutorVerificationDocumentEntity)
    private readonly documentRepo: Repository<TutorVerificationDocumentEntity>,
    @Inject(forwardRef(() => TutorVerificationStatusService))
    private readonly statusService: TutorVerificationStatusService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  async sweep(now: Date = new Date()): Promise<VerificationExpirySweepResult> {
    const result: VerificationExpirySweepResult = {
      scannedAt: now.toISOString(),
      expiredLevels: 0,
      expiredDocuments: 0,
      remindersSent: 0,
      alreadyNotified: 0,
      notifiedTutors: [],
      failures: [],
    };
    const notified = new Set<string>();
    try {
      await this.expireDocuments(now, result, notified);
      await this.expireLevels(now, result, notified);
      await this.sendDocumentReminders(now, result, notified);
    } catch (err) {
      this.logger.error(`Verification expiry sweep failed: ${String(err)}`);
      result.failures.push({ subject: 'sweep', reason: String(err) });
    }
    result.notifiedTutors = [...notified];
    this.logger.log(
      `Verification sweep complete: ${result.expiredLevels} level(s) expired, ` +
        `${result.expiredDocuments} document(s) expired, ${result.remindersSent} reminder(s) sent.`,
    );
    return result;
  }

  /** Approved evidence that has passed its validity date invalidates its level. */
  private async expireDocuments(
    now: Date,
    result: VerificationExpirySweepResult,
    notified: Set<string>,
  ): Promise<void> {
    const documents = await this.documentRepo.find({
      where: { reviewStatus: 'approved', deletedAt: IsNull() },
      take: VERIFICATION_SWEEP_BATCH_SIZE,
    });
    const touchedTutors = new Set<string>();
    for (const document of documents) {
      if (!document.expiresOn) continue;
      if (utcDaysUntil(document.expiresOn, now) >= 0) continue;
      if (document.reminderStage === 'EXPIRED') {
        result.alreadyNotified += 1;
        continue;
      }
      const levelRow = await this.levelRepo.findOne({
        where: { tutorUserId: document.tutorUserId, level: document.level },
      });
      // The security-relevant part (revoking eligibility) happens before any
      // notification so a delivery failure can never leave an expired document
      // backed by an approved level.
      if (levelRow && levelRow.status === 'approved') {
        levelRow.status = 'expired';
        levelRow.version += 1;
        levelRow.decidedAt = now;
        levelRow.expiresAt = null;
        await this.levelRepo.save(levelRow);
        result.expiredLevels += 1;
        touchedTutors.add(document.tutorUserId);
      }
      await this.auditService.record({
        actorUserId: null,
        action: 'tutor.verification.document_expired',
        resourceType: 'tutor_verification_document',
        resourceId: document.id,
        safeMetadata: {
          tutorId: document.tutorUserId,
          level: document.level,
          documentType: document.documentType,
        },
      });
      const delivered = await this.dispatch(notified, {
        userId: document.tutorUserId,
        eventType: 'tutor.verification_expired',
        level: document.level,
      });
      // Stage is advanced only after a successful delivery so a failed send is
      // retried on the next run instead of being silently dropped.
      if (delivered) {
        document.reminderStage = 'EXPIRED';
        document.lastRemindedAt = now;
        await this.documentRepo.save(document);
        result.remindersSent += 1;
      }
      result.expiredDocuments += 1;
    }
    for (const tutorId of touchedTutors) {
      await this.statusService.recomputeDerivedStatus(tutorId, TUTOR_VERIFICATION_POLICY_VERSION);
    }
  }

  /** Approved levels whose policy validity window has elapsed. */
  private async expireLevels(
    now: Date,
    result: VerificationExpirySweepResult,
    notified: Set<string>,
  ): Promise<void> {
    const levels = await this.levelRepo.find({
      where: { status: 'approved', expiresAt: LessThanOrEqual(now) },
      take: VERIFICATION_SWEEP_BATCH_SIZE,
    });
    const touchedTutors = new Set<string>();
    for (const levelRow of levels) {
      levelRow.status = 'expired';
      levelRow.version += 1;
      levelRow.decidedAt = now;
      await this.levelRepo.save(levelRow);
      result.expiredLevels += 1;
      const delivered = await this.dispatch(notified, {
        userId: levelRow.tutorUserId,
        eventType: 'tutor.verification_expired',
        level: levelRow.level,
      });
      if (delivered) result.remindersSent += 1;
      touchedTutors.add(levelRow.tutorUserId);
      await this.auditService.record({
        actorUserId: null,
        action: 'tutor.verification.level_expired',
        resourceType: 'tutor_verification_level',
        resourceId: levelRow.id,
        safeMetadata: { tutorId: levelRow.tutorUserId, level: levelRow.level },
      });
    }
    for (const tutorId of touchedTutors) {
      await this.statusService.recomputeDerivedStatus(tutorId, TUTOR_VERIFICATION_POLICY_VERSION);
    }
  }

  /** D-30 / D-7 reminders, delivered at most once per stage per document. */
  private async sendDocumentReminders(
    now: Date,
    result: VerificationExpirySweepResult,
    notified: Set<string>,
  ): Promise<void> {
    const documents = await this.documentRepo.find({
      where: { reviewStatus: 'approved', deletedAt: IsNull() },
      take: VERIFICATION_SWEEP_BATCH_SIZE,
    });
    const maxOffset = Math.max(...VERIFICATION_REMINDER_OFFSETS_DAYS);
    for (const document of documents) {
      if (!document.expiresOn) continue;
      const daysUntil = utcDaysUntil(document.expiresOn, now);
      if (daysUntil < 0 || daysUntil > maxOffset) continue;
      const stage = resolveReminderStage(daysUntil);
      if (!stage) continue;
      if (document.reminderStage === stage) {
        result.alreadyNotified += 1;
        continue;
      }
      const delivered = await this.dispatch(notified, {
        userId: document.tutorUserId,
        eventType: 'tutor.document_expiring',
        level: document.level,
        documentType: document.documentType,
        daysRemaining: Math.max(0, daysUntil),
      });
      if (!delivered) continue;
      document.reminderStage = stage;
      document.lastRemindedAt = now;
      await this.documentRepo.save(document);
      result.remindersSent += 1;
    }
  }

  /** Returns true when the notification was accepted by the delivery service. */
  private async dispatch(
    notified: Set<string>,
    input: {
      userId: string;
      eventType: 'tutor.verification_expired' | 'tutor.document_expiring';
      level: TutorVerificationLevel;
      documentType?: string;
      daysRemaining?: number;
    },
  ): Promise<boolean> {
    if (!this.notificationService) return false;
    try {
      await this.notificationService.dispatch({
        userId: input.userId,
        eventType: input.eventType,
        recipientRole: 'tutor',
        payload: {
          level: TUTOR_VERIFICATION_POLICY[input.level].labelEn,
          documentType: input.documentType ?? '',
          daysRemaining: input.daysRemaining ?? 0,
        },
      });
      notified.add(input.userId);
      return true;
    } catch (err) {
      // Reminder delivery must never fail the sweep; the stage is not advanced,
      // so the next daily run retries the same stage.
      this.logger.warn(`Failed to deliver ${input.eventType} to ${input.userId}: ${String(err)}`);
      return false;
    }
  }
}
