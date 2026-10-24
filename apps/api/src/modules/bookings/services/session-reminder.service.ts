import type { ReminderGenerationResult } from '../interfaces/session-reminder.interfaces';
import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BookingSessionEntity } from '../entities/booking-session.entity';
import { OutboxEventEntity } from '../entities/outbox-event.entity';
import { NotificationService } from '../../notifications/notification.service';
import { formatZonedDateTime } from '../utils/zoned-time';

export const REMINDER_WINDOW_MINUTES = 30;

export type { ReminderGenerationResult } from '../interfaces/session-reminder.interfaces';

/**
 * Idempotent 30-minute session reminder generation.
 *
 * Selection: `scheduled` sessions starting within the next 30 minutes that
 * have not been reminded. For each, an outbox event with
 * `idempotency_key = 'session.reminder:<sessionId>'` is inserted and
 * `reminder_sent_at` is set in the same transaction. The partial unique index
 * on `outbox_events(idempotency_key)` makes a duplicate run a no-op.
 */
@Injectable()
export class SessionReminderService {
  private readonly logger = new Logger(SessionReminderService.name);

  constructor(
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  async generateDueReminders(now: Date = new Date()): Promise<ReminderGenerationResult> {
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60_000);

    const due = await this.sessionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .where('s.status = :status', { status: 'scheduled' })
      .andWhere('s.reminderSentAt IS NULL')
      .andWhere('s.startsAt >= :now AND s.startsAt <= :windowEnd', { now, windowEnd })
      .orderBy('s.startsAt', 'ASC')
      .take(100)
      .getMany();

    let created = 0;
    let skipped = 0;

    for (const session of due) {
      const key = `session.reminder:${session.id}`;
      try {
        if (this.dataSource) {
          const inserted = await this.dataSource.transaction(async (manager) => {
            const updateResult = await manager
              .createQueryBuilder()
              .update(BookingSessionEntity)
              .set({ reminderSentAt: new Date() })
              .where('id = :id AND reminder_sent_at IS NULL', { id: session.id })
              .execute();
            if (!updateResult.affected) return false;

            await manager
              .createQueryBuilder()
              .insert()
              .into(OutboxEventEntity)
              .values({
                eventType: 'session.reminder',
                aggregateType: 'session',
                aggregateId: session.id,
                payload: {
                  sessionId: session.id,
                  bookingId: session.bookingId,
                  tutorUserId: session.tutorUserId,
                  studentUserId: session.studentUserId,
                  subjectName:
                    session.booking?.subject?.nameEn ||
                    session.booking?.subject?.nameBn ||
                    'Tutoring Session',
                  startsAt: session.startsAt.toISOString(),
                  localStart: formatZonedDateTime(session.startsAt, session.timezone),
                  timezone: session.timezone,
                },
                idempotencyKey: key,
              })
              .orIgnore()
              .execute();
            return true;
          });
          if (inserted) created++;
          else skipped++;
        } else {
          const event = this.outboxRepo.create({
            eventType: 'session.reminder',
            aggregateType: 'session',
            aggregateId: session.id,
            payload: {
              sessionId: session.id,
              bookingId: session.bookingId,
              tutorUserId: session.tutorUserId,
              studentUserId: session.studentUserId,
              subjectName: session.booking?.subject?.nameEn || 'Tutoring Session',
              startsAt: session.startsAt.toISOString(),
              localStart: formatZonedDateTime(session.startsAt, session.timezone),
              timezone: session.timezone,
            },
            idempotencyKey: key,
          });
          try {
            await this.outboxRepo.save(event);
          } catch (err: unknown) {
            const code =
              typeof err === 'object' && err !== null && 'code' in err
                ? (err as { code: unknown }).code
                : undefined;
            if (code === '23505') {
              skipped++;
              continue;
            }
            throw err;
          }
          session.reminderSentAt = new Date();
          await this.sessionRepo.save(session);
          created++;
        }
      } catch (err) {
        this.logger.warn(`Failed to generate reminder for session ${session.id}: ${String(err)}`);
        skipped++;
      }
    }

    return { scanned: due.length, created, skipped };
  }

  /**
   * Optional direct dispatch path for tests/ops. Production delivery goes
   * through the outbox worker so a notification failure cannot lose the
   * reminder.
   */
  async dispatchReminder(sessionId: string): Promise<void> {
    if (!this.notificationService) return;
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: { booking: { subject: true } },
    });
    if (!session || session.status !== 'scheduled') return;
    const subjectName = session.booking?.subject?.nameEn || 'Tutoring Session';
    const localStart = formatZonedDateTime(session.startsAt, session.timezone);
    const recipients: Array<{ id: string; role: 'student' | 'tutor' }> = [
      { id: session.studentUserId, role: 'student' },
      { id: session.tutorUserId, role: 'tutor' },
    ];
    for (const recipient of recipients) {
      await this.notificationService
        .dispatch({
          userId: recipient.id,
          recipientRole: recipient.role,
          eventType: 'session.reminder',
          payload: {
            sessionId: session.id,
            bookingId: session.bookingId,
            subjectName,
            startTime: localStart,
          },
        })
        .catch((err) =>
          this.logger.warn(`Reminder dispatch failed for ${recipient.id}: ${String(err)}`),
        );
    }
  }
}
