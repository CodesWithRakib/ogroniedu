import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingMessageEntity } from './entities/booking-message.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { GuardianAccessService } from '../guardians/guardian-access.service';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from './notification.service';
import { SendBookingMessageDto } from './dto/send-booking-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';
import {
  cursorPaginated,
  type CursorCollectionEnvelope,
} from '../../common/api-response/api-response';
import { decodeCursor, encodeCursor } from '../../common/pagination/pagination';

/** Default chat history page size (preserves the previous take:100 cap via max 100). */
const DEFAULT_MESSAGES_PAGE_SIZE = 50;

/**
 * Resolve the tutor user id for a booking without `any` casts.
 * Falls back to loaded `tutor` / `tutorProfile` relations (identical runtime
 * semantics to the previous `(booking as any).tutor?.userId` chain: falsy
 * values fall through, first truthy string wins).
 */
function resolveBookingTutorUserId(booking: BookingEntity): string | undefined {
  const record = booking as unknown as Record<string, unknown>;
  const candidates: unknown[] = [booking.tutorUserId];
  for (const relation of ['tutor', 'tutorProfile'] as const) {
    const rel = record[relation];
    candidates.push(
      typeof rel === 'object' && rel !== null ? (rel as Record<string, unknown>).userId : undefined,
    );
  }
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) return candidate;
  }
  return undefined;
}

/**
 * Resolve a participant display name without `any` casts.
 * Identical runtime semantics to `(user as any).displayName || user.email || fallback`.
 */
function resolveParticipantDisplayName(user: AuthenticatedUser, fallback: string): string {
  const record = user as unknown as Record<string, unknown>;
  const displayName = record.displayName;
  if (typeof displayName === 'string' && displayName.length > 0) return displayName;
  if (typeof user.email === 'string' && user.email.length > 0) return user.email;
  return fallback;
}

@Injectable()
export class BookingMessagesService {
  private readonly logger = new Logger(BookingMessagesService.name);

  // Content safety regex for Bangladeshi phone numbers & off-platform channels
  private readonly phoneRegex = /(?:\+?880\s?|0)1[3-9]\d{2}[\s-]?\d{6}/gi;
  private readonly paymentSolicitationRegex =
    /(?:bkash\s+personal|nagad\s+personal|send\s+money|হাতে\s+হাতে\s+টাকা|বিকাশ\s+পার্সোনাল|নগদ\s+পার্সোনাল)/gi;
  private readonly externalLinkRegex = /(?:https?:\/\/|www\.)[^\s]+(?:\.com|\.me|\.org|\.net)/gi;

  constructor(
    @InjectRepository(BookingMessageEntity)
    private readonly messageRepo: Repository<BookingMessageEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 1. Send Participant-Scoped Message with ABAC & Content Safety Redaction
   */
  async sendMessage(
    user: AuthenticatedUser,
    bookingId: string,
    dto: SendBookingMessageDto,
    requestId?: string,
  ): Promise<BookingMessageEntity> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: {
        studentUser: true,
        requesterUser: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // ABAC Check: User must be student, requester guardian, or tutor of the booking
    const tutorUserId = resolveBookingTutorUserId(booking);
    const isStudent = user.id === booking.studentUserId;
    const isRequester = user.id === booking.requesterUserId;
    const isTutor = user.id === tutorUserId;
    const isAdmin = isAdminRole(user);

    if (!isStudent && !isRequester && !isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: You are not an authorized participant in this booking',
      );
    }

    // Determine recipient user ID
    let recipientUserId: string;
    if (isTutor) {
      recipientUserId = booking.studentUserId;
    } else {
      if (!tutorUserId) {
        throw new NotFoundException('Tutor user not found for this booking');
      }
      recipientUserId = tutorUserId;
    }

    // 2. Content Safety & Direct Contact Redaction Inspection
    let sanitizedContent = dto.content;
    let isRedacted = false;
    let redactionReason: string | null = null;

    if (this.phoneRegex.test(sanitizedContent)) {
      sanitizedContent = sanitizedContent.replace(this.phoneRegex, '[REDACTED CONTACT NUMBER]');
      isRedacted = true;
      redactionReason = 'Direct phone number sharing restricted for escrow and child safety';
    }

    if (this.paymentSolicitationRegex.test(sanitizedContent)) {
      sanitizedContent = sanitizedContent.replace(
        this.paymentSolicitationRegex,
        '[REDACTED PAYMENT SOLICITATION]',
      );
      isRedacted = true;
      redactionReason = 'Direct off-platform payment solicitations strictly prohibited';
    }

    if (this.externalLinkRegex.test(sanitizedContent)) {
      sanitizedContent = sanitizedContent.replace(
        this.externalLinkRegex,
        '[REDACTED EXTERNAL LINK]',
      );
      isRedacted = true;
      redactionReason = 'External links restricted for platform safety';
    }

    // 3. Persist Message
    const message = this.messageRepo.create({
      bookingId: booking.id,
      senderUserId: user.id,
      recipientUserId,
      content: sanitizedContent,
      isRedacted,
      redactionReason,
    });

    const savedMessage = await this.messageRepo.save(message);

    // 4. Outbox Event (Transactional)
    const outbox = this.outboxRepo.create({
      aggregateType: 'booking_message',
      aggregateId: savedMessage.id,
      eventType: 'booking.message_sent',
      payload: {
        bookingId: booking.id,
        senderUserId: user.id,
        recipientUserId,
        isRedacted,
      },
    });
    await this.outboxRepo.save(outbox);

    // 5. Audit Log if Redaction Occurred
    if (isRedacted) {
      await this.auditService.record({
        actorUserId: user.id,
        action: 'message.safety_redacted',
        resourceType: 'booking_messages',
        resourceId: savedMessage.id,
        requestId,
        safeMetadata: {
          bookingId: booking.id,
          reason: redactionReason,
        },
      });
    }

    // 6. Asynchronous Notification to Recipient
    await this.notificationService
      .dispatch({
        userId: recipientUserId,
        recipientRole: isTutor ? 'student' : 'tutor',
        eventType: 'chat.message',
        payload: {
          bookingId: booking.id,
          senderName: resolveParticipantDisplayName(user, 'Participant'),
          preview: sanitizedContent.slice(0, 50),
        },
      })
      .catch((err) => this.logger.warn(`Failed to dispatch message notification: ${err}`));

    // Notify linked guardians if student received message
    if (recipientUserId === booking.studentUserId) {
      const guardianIds = await this.guardianAccess.findActiveGuardianIds(booking.studentUserId);
      for (const guardianId of guardianIds) {
        await this.notificationService
          .dispatch({
            userId: guardianId,
            recipientRole: 'guardian',
            eventType: 'system.announcement',
            payload: {
              bookingId: booking.id,
              studentName: booking.studentUser?.displayName || 'Student',
              senderName: resolveParticipantDisplayName(user, 'Tutor'),
            },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch guardian message notification: ${err}`),
          );
      }
    }

    return savedMessage;
  }

  /**
   * 2. Get Messages for a Booking (ABAC Scoped, cursor-backward history).
   * No cursor → latest `pageSize` messages. With cursor → messages strictly
   * older than the cursor edge. Internal order is (created_at DESC, id DESC)
   * via bound query-builder parameters; `data` is returned ASC
   * (oldest→newest) for display compat.
   */
  async getMessages(
    user: AuthenticatedUser,
    bookingId: string,
    query?: GetMessagesQueryDto,
  ): Promise<CursorCollectionEnvelope<BookingMessageEntity>> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const tutorUserId = resolveBookingTutorUserId(booking);
    const isStudent = user.id === booking.studentUserId;
    const isRequester = user.id === booking.requesterUserId;
    const isTutor = user.id === tutorUserId;
    const isAdmin = isAdminRole(user);

    if (!isStudent && !isRequester && !isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this communication thread',
      );
    }

    const pageSize = query?.pageSize ?? DEFAULT_MESSAGES_PAGE_SIZE;
    const cursor = decodeCursor(query?.cursor);

    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.senderUser', 'senderUser')
      .where('m.booking_id = :bookingId', { bookingId });

    if (cursor) {
      qb.andWhere(
        '(m.created_at < :cursorTime OR (m.created_at = :cursorTime AND m.id < :cursorId))',
        { cursorTime: cursor.t, cursorId: cursor.id },
      );
    }

    const rows = await qb
      .orderBy('m.created_at', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .take(pageSize + 1)
      .getMany();

    const hasNextPage = rows.length > pageSize;
    const page = hasNextPage ? rows.slice(0, pageSize) : rows;
    // Display compat: oldest→newest.
    const data = [...page].reverse();
    const oldest = page.length > 0 ? page[page.length - 1] : undefined;
    const nextCursor =
      hasNextPage && oldest
        ? encodeCursor({ t: oldest.createdAt.toISOString(), id: oldest.id })
        : null;

    return cursorPaginated(data, {
      nextCursor,
      previousCursor: null,
      hasNextPage,
      pageSize,
    });
  }

  /**
   * 3. Mark Message as Read
   */
  async markAsRead(user: AuthenticatedUser, messageId: string): Promise<BookingMessageEntity> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }

    if (message.recipientUserId !== user.id && !isAdminRole(user)) {
      throw new ForbiddenException('Access denied to update read status');
    }

    message.readAt = new Date();
    return this.messageRepo.save(message);
  }
}
