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
import { NotificationGateway } from './notification.gateway';
import { SendBookingMessageDto } from './dto/send-booking-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../common/auth/role.utils';
import {
  cursorPaginated,
  type CursorCollectionEnvelope,
} from '../../common/api-response/api-response';
import { decodeCursor, encodeCursor } from '../../common/pagination/pagination';
import { inspectAndRedactContent } from './utils/content-safety.util';
import type { ConversationInboxItem } from '@ogroniedu/contracts';

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
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway?: NotificationGateway,
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

    // ABAC Check: User must be student, requester guardian, linked guardian, tutor, or admin
    const tutorUserId = resolveBookingTutorUserId(booking);
    const isStudent = user.id === booking.studentUserId;
    const isRequester = user.id === booking.requesterUserId;
    const isTutor = user.id === tutorUserId;
    const isAdmin = isAdminRole(user);

    let isGuardian = false;
    if (!isStudent && !isRequester && !isTutor && !isAdmin) {
      const activeGuardianIds = await this.guardianAccess.findActiveGuardianIds(
        booking.studentUserId,
      );
      isGuardian = activeGuardianIds.includes(user.id);
    }

    if (!isStudent && !isRequester && !isTutor && !isGuardian && !isAdmin) {
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
    const safetyResult = inspectAndRedactContent(dto.content);
    const sanitizedContent = safetyResult.sanitizedContent;
    const isRedacted = safetyResult.isRedacted;
    const redactionReason = safetyResult.redactionReason;

    // 3. Persist Message
    const message = this.messageRepo.create({
      bookingId: booking.id,
      senderUserId: user.id,
      recipientUserId,
      content: sanitizedContent,
      isRedacted,
      redactionReason,
      attachmentAssetIds: dto.attachmentAssetIds || [],
      metadata: dto.metadata || {},
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
        hasAttachments: (dto.attachmentAssetIds?.length ?? 0) > 0,
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
          violationCodes: safetyResult.violationCodes,
        },
      });
    }

    // 6. Real-Time Socket.IO Broadcast to Active Room & Recipient
    this.notificationGateway?.broadcastChatMessage(booking.id, savedMessage, recipientUserId);

    // 7. Asynchronous Notification to Recipient
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

    let isGuardian = false;
    if (!isStudent && !isRequester && !isTutor && !isAdmin) {
      const activeGuardianIds = await this.guardianAccess.findActiveGuardianIds(
        booking.studentUserId,
      );
      isGuardian = activeGuardianIds.includes(user.id);
    }

    if (!isStudent && !isRequester && !isTutor && !isGuardian && !isAdmin) {
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
    const saved = await this.messageRepo.save(message);

    // Broadcast live read receipt
    this.notificationGateway?.broadcastReadReceipt(
      message.bookingId,
      user.id,
      message.id,
      message.readAt,
    );

    return saved;
  }

  /**
   * 4. Mark All Unread Messages in Booking as Read
   */
  async markAllInBookingAsRead(
    user: AuthenticatedUser,
    bookingId: string,
  ): Promise<{ updatedCount: number }> {
    const unread = await this.messageRepo.find({
      where: {
        bookingId,
        recipientUserId: user.id,
        readAt: null as unknown as undefined,
      },
    });

    const now = new Date();
    for (const msg of unread) {
      msg.readAt = now;
      await this.messageRepo.save(msg);
      this.notificationGateway?.broadcastReadReceipt(bookingId, user.id, msg.id, now);
    }

    return { updatedCount: unread.length };
  }

  /**
   * 5. Get Conversations Inbox for Authenticated User
   */
  async getConversationsInbox(user: AuthenticatedUser): Promise<ConversationInboxItem[]> {
    let studentIds: string[] = [];
    if (user.roles?.includes('guardian')) {
      studentIds = await this.guardianAccess.findActiveStudentIds(user.id).catch(() => []);
    }

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.studentUser', 'studentUser')
      .leftJoinAndSelect('b.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndSelect('b.subject', 'subject')
      .leftJoinAndSelect('b.educationLevel', 'educationLevel')
      .where(
        '(b.student_user_id = :userId OR b.requester_user_id = :userId OR b.tutor_user_id = :userId)',
        { userId: user.id },
      );

    if (studentIds.length > 0) {
      qb.orWhere('b.student_user_id IN (:...studentIds)', { studentIds });
    }

    const bookings = await qb.getMany();
    if (bookings.length === 0) {
      return [];
    }

    const bookingIds = bookings.map((b) => b.id);

    // Fetch latest messages for each booking
    const messages = await this.messageRepo
      .createQueryBuilder('m')
      .where('m.booking_id IN (:...bookingIds)', { bookingIds })
      .orderBy('m.created_at', 'DESC')
      .getMany();

    const latestByBooking = new Map<string, BookingMessageEntity>();
    for (const m of messages) {
      if (!latestByBooking.has(m.bookingId)) {
        latestByBooking.set(m.bookingId, m);
      }
    }

    // Count unread for user
    const unreadRaw = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.booking_id', 'bookingId')
      .addSelect('COUNT(m.id)', 'count')
      .where('m.booking_id IN (:...bookingIds)', { bookingIds })
      .andWhere('m.recipient_user_id = :userId', { userId: user.id })
      .andWhere('m.read_at IS NULL')
      .groupBy('m.booking_id')
      .getRawMany<{ bookingId: string; count: string }>();

    const unreadMap = new Map<string, number>();
    for (const r of unreadRaw) {
      unreadMap.set(r.bookingId, parseInt(r.count, 10) || 0);
    }

    const items: ConversationInboxItem[] = bookings.map((b) => {
      const isCallerTutor = user.id === b.tutorUserId;
      const partner = isCallerTutor
        ? {
            id: b.studentUserId,
            displayName: b.studentUser?.displayName || 'Student',
            avatarUrl: b.studentUser?.avatarUrl || null,
            role: 'student' as const,
          }
        : {
            id: b.tutorUserId,
            displayName: b.tutorProfile?.user?.displayName || 'Tutor',
            avatarUrl: b.tutorProfile?.avatarUrl || null,
            role: 'tutor' as const,
          };

      const lastMsg = latestByBooking.get(b.id);
      return {
        bookingId: b.id,
        subjectName: b.subject?.nameEn || b.subject?.nameBn || 'Tuition Class',
        educationLevelName: b.educationLevel?.nameEn || b.educationLevel?.nameBn,
        status: b.status,
        partnerUser: partner,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              isRedacted: lastMsg.isRedacted,
              createdAt: lastMsg.createdAt.toISOString(),
              isMine: lastMsg.senderUserId === user.id,
              readAt: lastMsg.readAt ? lastMsg.readAt.toISOString() : null,
            }
          : null,
        unreadCount: unreadMap.get(b.id) || 0,
        updatedAt: (lastMsg?.createdAt || b.updatedAt || b.createdAt).toISOString(),
      };
    });

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return items;
  }
}
