import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingMessageEntity } from './entities/booking-message.entity';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { GuardianStudentLinkEntity } from '../guardians/entities/guardian-student-link.entity';
import { OutboxEventEntity } from '../bookings/entities/outbox-event.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from './notification.service';
import { SendBookingMessageDto } from './dto/send-booking-message.dto';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class BookingMessagesService {
  private readonly logger = new Logger(BookingMessagesService.name);

  // Content safety regex for Bangladeshi phone numbers & off-platform channels
  private readonly phoneRegex = /(?:\+?880\s?|0)1[3-9]\d{2}[\s\-]?\d{6}/gi;
  private readonly paymentSolicitationRegex =
    /(?:bkash\s+personal|nagad\s+personal|send\s+money|হাতে\s+হাতে\s+টাকা|বিকাশ\s+পার্সোনাল|নগদ\s+পার্সোনাল)/gi;
  private readonly externalLinkRegex =
    /(?:https?:\/\/|www\.)[^\s]+(?:\.com|\.me|\.org|\.net)/gi;

  constructor(
    @InjectRepository(BookingMessageEntity)
    private readonly messageRepo: Repository<BookingMessageEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(GuardianStudentLinkEntity)
    private readonly guardianLinkRepo: Repository<GuardianStudentLinkEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    private readonly auditService: AuditService,
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
    const tutorUserId =
      booking.tutorUserId ||
      (booking as any).tutor?.userId ||
      (booking as any).tutorProfile?.userId;
    const isStudent = user.id === booking.studentUserId;
    const isRequester = user.id === booking.requesterUserId;
    const isTutor = user.id === tutorUserId;
    const isAdmin = user.roles?.includes('admin');

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
      sanitizedContent = sanitizedContent.replace(
        this.phoneRegex,
        '[REDACTED CONTACT NUMBER]',
      );
      isRedacted = true;
      redactionReason =
        'Direct phone number sharing restricted for escrow and child safety';
    }

    if (this.paymentSolicitationRegex.test(sanitizedContent)) {
      sanitizedContent = sanitizedContent.replace(
        this.paymentSolicitationRegex,
        '[REDACTED PAYMENT SOLICITATION]',
      );
      isRedacted = true;
      redactionReason =
        'Direct off-platform payment solicitations strictly prohibited';
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
        eventType: 'system.announcement',
        payload: {
          bookingId: booking.id,
          senderName: (user as any).displayName || user.email || 'Participant',
          snippet: sanitizedContent.slice(0, 50),
        },
      })
      .catch((err) =>
        this.logger.warn(`Failed to dispatch message notification: ${err}`),
      );

    // Notify linked guardians if student received message
    if (recipientUserId === booking.studentUserId) {
      const guardians = await this.guardianLinkRepo.find({
        where: { studentUserId: booking.studentUserId, status: 'active' },
      });
      for (const g of guardians) {
        await this.notificationService
          .dispatch({
            userId: g.guardianUserId,
            recipientRole: 'guardian',
            eventType: 'system.announcement',
            payload: {
              bookingId: booking.id,
              studentName: booking.studentUser?.displayName || 'Student',
              senderName: (user as any).displayName || user.email || 'Tutor',
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
   * 2. Get Messages for a Booking (ABAC Scoped)
   */
  async getMessages(
    user: AuthenticatedUser,
    bookingId: string,
  ): Promise<BookingMessageEntity[]> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const tutorUserId =
      booking.tutorUserId ||
      (booking as any).tutor?.userId ||
      (booking as any).tutorProfile?.userId;
    const isStudent = user.id === booking.studentUserId;
    const isRequester = user.id === booking.requesterUserId;
    const isTutor = user.id === tutorUserId;
    const isAdmin = user.roles?.includes('admin');

    if (!isStudent && !isRequester && !isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: You are not authorized to view this communication thread',
      );
    }

    return this.messageRepo.find({
      where: { bookingId },
      relations: { senderUser: true },
      order: { createdAt: 'ASC' },
      take: 100,
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

    if (message.recipientUserId !== user.id && !user.roles?.includes('admin')) {
      throw new ForbiddenException('Access denied to update read status');
    }

    message.readAt = new Date();
    return this.messageRepo.save(message);
  }
}
