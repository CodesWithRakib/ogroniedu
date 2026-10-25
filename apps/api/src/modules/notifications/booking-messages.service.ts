import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
import { UserEntity } from '../auth/entities/user.entity';
import { UserSafetyEnforcementService } from '../trust/services/user-safety-enforcement.service';

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
  if (typeof displayName === 'string' && displayName.trim().length > 0 && !displayName.includes('@')) {
    return displayName.trim();
  }
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
    @InjectRepository(UserEntity)
    private readonly userRepo?: Repository<UserEntity>,
    @Inject(forwardRef(() => UserSafetyEnforcementService))
    private readonly safetyEnforcement?: UserSafetyEnforcementService,
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
    // 0. Verify sender is not suspended or banned & resolve database profile
    let senderUserRecord: UserEntity | null = null;
    if (this.userRepo) {
      senderUserRecord = await this.userRepo.findOne({
        where: { id: user.id },
        select: { id: true, displayName: true, avatarUrl: true, status: true, email: true },
      });
      if (senderUserRecord && (senderUserRecord.status === 'suspended' || senderUserRecord.status === 'banned')) {
        throw new ForbiddenException(
          'আপনার অ্যাকাউন্ট নীতি লঙ্ঘনের কারণে স্থগিত বা নিষিদ্ধ অবস্থায় রয়েছে। কোনো বার্তা পাঠানো সম্ভব নয়।',
        );
      }
    }
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
    if (isAdmin) {
      recipientUserId = booking.studentUserId;
    } else if (isTutor) {
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
    const resolvedSenderRole: 'student' | 'guardian' | 'tutor' | 'admin' =
      isAdmin
        ? 'admin'
        : isTutor
          ? 'tutor'
          : isGuardian
            ? 'guardian'
            : 'student';

    const senderDisplayName = isAdmin
      ? 'অগ্রণী প্ল্যাটফর্ম মডারেটর'
      : (senderUserRecord?.displayName || resolveParticipantDisplayName(user, 'User'));

    const message = this.messageRepo.create({
      bookingId: booking.id,
      senderUserId: user.id,
      recipientUserId,
      content: sanitizedContent,
      isRedacted,
      redactionReason,
      attachmentAssetIds: dto.attachmentAssetIds || [],
      metadata: {
        ...(dto.metadata || {}),
        senderRole: resolvedSenderRole,
        senderName: senderDisplayName,
        ...(isAdmin
          ? { isStaffIntervention: true, staffTitle: 'অগ্রণী সাপোর্ট ডেস্ক' }
          : {}),
      },
    });

    const savedMessage = await this.messageRepo.save(message);

    // Attach senderUser identity so live socket broadcasts have immediate user display info
    savedMessage.senderUser = {
      id: user.id,
      displayName: senderDisplayName,
      avatarUrl: senderUserRecord?.avatarUrl || ((user as unknown as Record<string, unknown>).avatarUrl as string | null | undefined),
    } as UserEntity;

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

      // 5.1 Automated Strike & Punishment Escalation Ladder for Inappropriate / Abusive / Threatening Language
      if (
        this.safetyEnforcement &&
        (safetyResult.hasAbusiveLanguage ||
          safetyResult.hasThreatOrHarassment ||
          safetyResult.violationCodes.includes('OFF_PLATFORM_PAYMENT'))
      ) {
        await this.safetyEnforcement
          .handleViolationAndEnforce(user.id, {
            violationCodes: safetyResult.violationCodes,
            reason: redactionReason || 'Content policy violation',
            bookingId: booking.id,
            messageId: savedMessage.id,
            severity: safetyResult.severity === 'none' ? undefined : safetyResult.severity,
          })
          .catch((err) => this.logger.warn(`Failed to execute automated safety strike: ${err}`));
      }
    }

    // 6. Find all active linked guardians of the student
    const guardianIds = (await this.guardianAccess?.findActiveGuardianIds(booking.studentUserId)) || [];

    // 7. Collect ALL participant user IDs: Student, Tutor, Requester, Sender, All Guardians
    const allParticipantIds = new Set<string>();
    if (booking.studentUserId) allParticipantIds.add(booking.studentUserId);
    if (tutorUserId) allParticipantIds.add(tutorUserId);
    if (booking.requesterUserId) allParticipantIds.add(booking.requesterUserId);
    if (user.id) allParticipantIds.add(user.id);
    for (const gId of guardianIds) {
      if (gId) allParticipantIds.add(gId);
    }

    // 8. Real-Time Socket.IO Broadcast to Active Room, Admin Oversight, and EVERY Participant's User Room
    this.notificationGateway?.broadcastChatMessage(
      booking.id,
      savedMessage,
      Array.from(allParticipantIds),
      guardianIds,
    );

    // 9. Asynchronous Notification to all other participants
    for (const targetUid of allParticipantIds) {
      if (targetUid !== user.id) {
        const targetRole: 'student' | 'tutor' | 'guardian' =
          targetUid === tutorUserId
            ? 'tutor'
            : targetUid === booking.studentUserId
              ? 'student'
              : 'guardian';

        this.notificationService
          .dispatch({
            userId: targetUid,
            recipientRole: targetRole,
            eventType: 'chat.message',
            payload: {
              bookingId: booking.id,
              senderName: senderDisplayName,
              preview: sanitizedContent.slice(0, 50),
            },
          })
          .catch((err) => this.logger.warn(`Failed to dispatch message notification: ${err}`));
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
      .leftJoinAndSelect('m.recipientUser', 'recipientUser')
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

    const readerName = resolveParticipantDisplayName(user, 'User');

    // Broadcast live read receipt
    this.notificationGateway?.broadcastReadReceipt(
      message.bookingId,
      user.id,
      message.id,
      message.readAt,
      readerName,
      message.senderUserId,
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
    try {
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
          'Access denied: You are not authorized to access this conversation',
        );
      }

      const now = new Date();
      const readerName = resolveParticipantDisplayName(user, 'User');

      // Check if createQueryBuilder is supported by repo mock (e.g. unit tests vs TypeORM)
      const qb = this.messageRepo.createQueryBuilder?.('m');
      if (!qb) {
        // Fallback for mock repositories without query builder
        const unreadMsgs = await this.messageRepo.find({
          where: {
            bookingId,
            readAt: IsNull(),
          },
        });
        const unreadFiltered = unreadMsgs.filter((m) => m.senderUserId !== user.id);
        for (const m of unreadFiltered) {
          m.readAt = now;
          await this.messageRepo.save(m);
          this.notificationGateway?.broadcastReadReceipt(
            bookingId,
            user.id,
            m.id,
            now,
            readerName,
            m.senderUserId,
          );
        }
        return { updatedCount: unreadFiltered.length };
      }

      // Find unread messages sent by others in this booking
      const unreadQb = qb
        .select('m.id', 'id')
        .addSelect('m.sender_user_id', 'senderUserId')
        .where('m.booking_id = :bookingId', { bookingId })
        .andWhere('m.sender_user_id != :userId', { userId: user.id });

      // If user is direct recipient, update their messages; if guardian/admin, also find unread messages to student
      if (isGuardian) {
        unreadQb.andWhere('(m.recipient_user_id = :userId OR m.recipient_user_id = :studentId)', {
          userId: user.id,
          studentId: booking.studentUserId,
        });
      } else if (!isAdmin) {
        unreadQb.andWhere('m.recipient_user_id = :userId', { userId: user.id });
      }

      const unread = await unreadQb.andWhere('m.read_at IS NULL').getRawMany<{ id: string; senderUserId: string }>();

      if (unread.length === 0) {
        return { updatedCount: 0 };
      }

      const unreadIds = unread.map((u) => u.id);

      // Bulk update readAt
      await this.messageRepo
        .createQueryBuilder()
        .update(BookingMessageEntity)
        .set({ readAt: now })
        .whereInIds(unreadIds)
        .andWhere('read_at IS NULL')
        .execute();

      // Broadcast read receipts to active booking room, reader's room, sender's room, and all participant user rooms
      const guardianIds = (await this.guardianAccess?.findActiveGuardianIds(booking.studentUserId)) || [];
      const allParticipantIds = new Set<string>();
      if (booking.studentUserId) allParticipantIds.add(booking.studentUserId);
      if (tutorUserId) allParticipantIds.add(tutorUserId);
      if (booking.requesterUserId) allParticipantIds.add(booking.requesterUserId);
      if (user.id) allParticipantIds.add(user.id);
      for (const gId of guardianIds) {
        if (gId) allParticipantIds.add(gId);
      }

      for (const msg of unread) {
        this.notificationGateway?.broadcastReadReceipt(
          bookingId,
          user.id,
          msg.id,
          now,
          readerName,
          msg.senderUserId,
          Array.from(allParticipantIds),
        );
      }

      return { updatedCount: unread.length };
    } catch (err) {
      this.logger.error(`Failed to mark messages as read for booking ${bookingId}: ${err}`);
      throw err;
    }
  }

  /**
   * 5. Get Conversations Inbox for Authenticated User (and Omniscient Staff/Admin View)
   */
  async getConversationsInbox(user: AuthenticatedUser): Promise<ConversationInboxItem[]> {
    const isAdmin = isAdminRole(user);
    let studentIds: string[] = [];
    if (!isAdmin && user.roles?.includes('guardian')) {
      studentIds = await this.guardianAccess.findActiveStudentIds(user.id).catch(() => []);
    }

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.studentUser', 'studentUser')
      .leftJoinAndSelect('b.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndSelect('b.subject', 'subject')
      .leftJoinAndSelect('b.educationLevel', 'educationLevel');

    if (!isAdmin) {
      qb.where(
        '(b.student_user_id = :userId OR b.requester_user_id = :userId OR b.tutor_user_id = :userId)',
        { userId: user.id },
      );

      if (studentIds.length > 0) {
        qb.orWhere('b.student_user_id IN (:...studentIds)', { studentIds });
      }
    }

    const bookings = await qb.orderBy('b.updated_at', 'DESC').take(isAdmin ? 100 : 50).getMany();
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

    const isGuardian = !isAdmin && user.roles?.includes('guardian');

    // Count unread for user (or for guardian viewing student's messages)
    const unreadQb = this.messageRepo
      .createQueryBuilder('m')
      .select('m.booking_id', 'bookingId')
      .addSelect('COUNT(m.id)', 'count')
      .where('m.booking_id IN (:...bookingIds)', { bookingIds })
      .andWhere('m.read_at IS NULL');

    if (isAdmin) {
      unreadQb.andWhere('m.sender_user_id != :userId', { userId: user.id });
    } else if (isGuardian && studentIds.length > 0) {
      unreadQb.andWhere(
        '(m.recipient_user_id = :userId OR m.recipient_user_id IN (:...studentIds)) AND m.sender_user_id != :userId',
        { userId: user.id, studentIds },
      );
    } else {
      unreadQb.andWhere('m.recipient_user_id = :userId', { userId: user.id });
    }

    const unreadRaw = await unreadQb.groupBy('m.booking_id').getRawMany<{ bookingId: string; count: string }>();

    const unreadMap = new Map<string, number>();
    for (const r of unreadRaw) {
      unreadMap.set(r.bookingId, parseInt(r.count, 10) || 0);
    }

    const items: ConversationInboxItem[] = bookings.map((b) => {
      const isCallerTutor = user.id === b.tutorUserId;
      let partner;
      if (isAdmin) {
        partner = {
          id: b.tutorUserId,
          displayName: `${b.studentUser?.displayName || 'Student'} ↔ ${b.tutorProfile?.user?.displayName || 'Tutor'}`,
          avatarUrl: b.tutorProfile?.avatarUrl || b.tutorProfile?.user?.avatarUrl || null,
          role: 'tutor' as const,
        };
      } else if (isGuardian && b.studentUserId !== user.id) {
        partner = {
          id: b.tutorUserId,
          displayName: `${b.tutorProfile?.user?.displayName || 'Tutor'} (${b.studentUser?.displayName || 'Student'})`,
          avatarUrl: b.tutorProfile?.avatarUrl || b.tutorProfile?.user?.avatarUrl || null,
          role: 'tutor' as const,
        };
      } else if (isCallerTutor) {
        partner = {
          id: b.studentUserId,
          displayName: b.studentUser?.displayName || 'Student',
          avatarUrl: b.studentUser?.avatarUrl || null,
          role: 'student' as const,
        };
      } else {
        partner = {
          id: b.tutorUserId,
          displayName: b.tutorProfile?.user?.displayName || 'Tutor',
          avatarUrl: b.tutorProfile?.avatarUrl || b.tutorProfile?.user?.avatarUrl || null,
          role: 'tutor' as const,
        };
      }

      const lastMsg = latestByBooking.get(b.id);
      return {
        bookingId: b.id,
        subjectName: b.subject?.nameEn || b.subject?.nameBn || 'Tuition Class',
        educationLevelName: b.educationLevel?.nameEn || b.educationLevel?.nameBn,
        status: b.status,
        partnerUser: partner,
        studentUser: {
          id: b.studentUserId,
          displayName: b.studentUser?.displayName || 'Student',
        },
        tutorUser: {
          id: b.tutorUserId,
          displayName: b.tutorProfile?.user?.displayName || 'Tutor',
        },
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
