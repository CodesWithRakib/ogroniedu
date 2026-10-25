import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import jwt from 'jsonwebtoken';
import type { NotificationItemDto, UnreadCountResponseDto } from '@ogroniedu/contracts';
import type { INotificationBroadcaster } from './interfaces/notification-broadcaster.interface';
import { NotificationService } from './notification.service';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { BookingMessageEntity } from './entities/booking-message.entity';
import { GuardianAccessService } from '../guardians/guardian-access.service';
import { isTestAuthBypassEnabled } from '../../common/auth/test-auth';

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const allowedWsOrigins = (process.env.FRONTEND_URL || 'http://localhost:5000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedWsOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:');
      callback(null, isAllowed);
    },
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect, INotificationBroadcaster {
  private readonly logger = new Logger(NotificationGateway.name);
  private readonly jwtSecret: string | undefined = process.env.JWT_SECRET;

  @WebSocketServer()
  server!: Server;

  private _notificationService?: NotificationService;
  private readonly moduleRef?: ModuleRef;

  constructor(
    @Optional()
    @Inject(ModuleRef)
    moduleRefOrService?: ModuleRef | NotificationService,
    @Optional()
    notificationService?: NotificationService,
    @Optional()
    @InjectRepository(BookingEntity)
    private readonly bookingRepo?: Repository<BookingEntity>,
    @Optional()
    @Inject(GuardianAccessService)
    private readonly guardianAccess?: GuardianAccessService,
  ) {
    if (moduleRefOrService) {
      if (
        moduleRefOrService instanceof NotificationService ||
        'getUnreadCount' in (moduleRefOrService as unknown as Record<string, unknown>)
      ) {
        this._notificationService = moduleRefOrService as NotificationService;
      } else {
        this.moduleRef = moduleRefOrService as ModuleRef;
      }
    }
    if (notificationService) {
      this._notificationService = notificationService;
    }
  }

  private get notificationService(): NotificationService {
    if (this._notificationService) {
      return this._notificationService;
    }
    if (this.moduleRef) {
      const resolved = this.moduleRef.get(NotificationService, { strict: false });
      if (resolved) {
        this._notificationService = resolved;
        return this._notificationService;
      }
    }
    throw new Error('NotificationService is not available in NotificationGateway');
  }

  async handleConnection(client: Socket) {
    try {
      if (!this.jwtSecret && process.env.NODE_ENV !== 'test') {
        this.logger.error('JWT_SECRET environment variable is required for WebSocket authentication');
        client.emit('auth_error', { message: 'Server configuration error' });
        client.disconnect(true);
        return;
      }
      const auth = client.handshake.auth || {};
      const headers = client.handshake.headers || {};
      const allowBypass = isTestAuthBypassEnabled();
      let userId: string | null = null;

      // 1. Verify a real JWT signature; never trust an unsigned/decoded token.
      let rawToken =
        typeof auth.token === 'string'
          ? auth.token.replace(/^Bearer\s+/i, '')
          : typeof headers.authorization === 'string'
            ? headers.authorization.replace(/^Bearer\s+/i, '')
            : null;

      if (!rawToken && typeof headers.cookie === 'string') {
        const match = headers.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
        if (match) {
          rawToken = decodeURIComponent(match[1]);
        }
      }

      if (!rawToken && typeof client.handshake.query?.token === 'string') {
        rawToken = client.handshake.query.token.replace(/^Bearer\s+/i, '');
      }

      if (rawToken && rawToken.includes('.')) {
        try {
          if (!this.jwtSecret) {
            throw new Error('JWT_SECRET environment variable is required for token verification');
          }
          const claims = jwt.verify(rawToken, this.jwtSecret);
          if (typeof claims !== 'string') {
            userId = readString(claims.sub) ?? readString(claims.id) ?? null;
            if (Array.isArray((claims as Record<string, unknown>).roles)) {
              client.data.roles = (claims as Record<string, unknown>).roles;
            }
          }
        } catch {
          userId = null;
        }
      } else if (allowBypass && typeof auth.token === 'string' && auth.token.startsWith('mock:')) {
        userId = auth.token.split(':')[1] ?? null;
      }

      // 2. Test-only fallbacks (header / query). Disabled outside test/development.
      if (allowBypass && !userId && headers['x-user-id']) {
        userId = String(headers['x-user-id']);
      }
      if (allowBypass && !userId && client.handshake.query.userId) {
        userId = String(client.handshake.query.userId);
      }

      if (!userId) {
        this.logger.warn(`Unauthorized socket connection attempt rejected: ${client.id}`);
        client.emit('auth_error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      // Secure server-side room join
      const room = `user:${userId}`;
      await client.join(room);
      client.data.userId = userId;
      this.logger.log(`Socket ${client.id} authenticated for user ${userId} in room ${room}`);

      const userRoles = Array.isArray(client.data.roles) ? (client.data.roles as string[]) : [];
      if (userRoles.some((r) => ['admin', 'super_admin', 'staff'].includes(r))) {
        await client.join('admin_oversight');
        this.logger.log(`Socket ${client.id} joined admin_oversight room`);
      }

      // Send initial unread count immediately upon connection
      const { unreadCount } = await this.notificationService.getUnreadCount(userId);
      client.emit('unread_count', { unreadCount });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error during socket handshake authentication: ${message}`);
      client.emit('auth_error', { message: 'Internal authentication error' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket ${client.id} disconnected (user: ${client.data?.userId || 'unknown'})`);
  }

  /**
   * Real-time delivery to a specific user's authenticated room
   */
  sendToUser(userId: string, notification: NotificationItemDto, unreadCount: number) {
    const room = `user:${userId}`;
    this.server.to(room).emit('notification', notification);
    this.server.to(room).emit('unread_count', { unreadCount });
    this.logger.log(
      `Dispatched real-time notification to room ${room}: ${notification.eventType} (#${notification.id})`,
    );
  }

  /**
   * Broadcast updated unread count to all user's connected tabs/devices
   */
  broadcastUnreadCount(userId: string, unreadCount: number) {
    const room = `user:${userId}`;
    this.server.to(room).emit('unread_count', { unreadCount });
  }

  /**
   * Broadcast new message to:
   * 1. Booking-specific chat room (active chat thread participants)
   * 2. Every participant's user room (Student, Tutor, Requester, Sender, All Guardians)
   * 3. Admin oversight room (platform compliance / monitoring)
   * Client-side dedup by message ID prevents double display.
   */
  broadcastChatMessage(
    bookingId: string,
    message: BookingMessageEntity,
    recipientOrTargetIds: string | string[],
    guardianUserIds: string[] = [],
  ) {
    if (!this.server) return;
    const bookingRoom = `booking_chat:${bookingId}`;

    // Collect all unique participant user rooms
    const targetRoomSet = new Set<string>();

    if (Array.isArray(recipientOrTargetIds)) {
      for (const uid of recipientOrTargetIds) {
        if (uid) targetRoomSet.add(`user:${uid}`);
      }
    } else if (typeof recipientOrTargetIds === 'string' && recipientOrTargetIds) {
      targetRoomSet.add(`user:${recipientOrTargetIds}`);
    }

    if (message.senderUserId) {
      targetRoomSet.add(`user:${message.senderUserId}`);
    }

    if (Array.isArray(guardianUserIds)) {
      for (const gId of guardianUserIds) {
        if (gId) targetRoomSet.add(`user:${gId}`);
      }
    }

    // 1. Emit to booking room for users with active chat thread open
    this.server.to(bookingRoom).emit('new_chat_message', message);

    // 2. Emit to every participant user room for instant inbox / sidebar / multi-tab / device sync
    for (const room of targetRoomSet) {
      this.server.to(room).emit('new_chat_message', message);
    }

    // 3. Emit to admin oversight room for live platform monitoring
    this.server.to('admin_oversight').emit('new_chat_message', message);

    // 4. Emit safety alert to admin oversight room if message contains redacted content
    if (message.isRedacted) {
      this.server.to('admin_oversight').emit('safety_flagged_message', {
        bookingId,
        messageId: message.id,
        senderUserId: message.senderUserId,
        redactionReason: message.redactionReason,
        createdAt: message.createdAt,
      });
    }

    this.logger.log(
      `Broadcast chat message #${message.id} to rooms: ${bookingRoom}, admin_oversight, and ${targetRoomSet.size} user rooms: [${Array.from(targetRoomSet).join(', ')}]`,
    );
  }

  /**
   * Broadcast read receipts to active booking chat room and sender's user room
   */
  broadcastReadReceipt(
    bookingId: string,
    readerUserId: string,
    messageId: string,
    readAt: Date,
    readerName?: string,
    senderUserId?: string,
    participantUserIds: string[] = [],
  ) {
    if (!this.server) return;
    const bookingRoom = `booking_chat:${bookingId}`;
    const payload: Record<string, unknown> = {
      bookingId,
      readerUserId,
      messageId,
      readAt: readAt.toISOString(),
    };
    if (readerName) {
      payload.readerName = readerName;
    }

    const targetRoomSet = new Set<string>();
    targetRoomSet.add(`user:${readerUserId}`);
    if (senderUserId) targetRoomSet.add(`user:${senderUserId}`);
    if (Array.isArray(participantUserIds)) {
      for (const pId of participantUserIds) {
        if (pId) targetRoomSet.add(`user:${pId}`);
      }
    }

    // 1. Emit to active booking room (anyone currently looking at this conversation)
    this.server.to(bookingRoom).emit('messages_read', payload);

    // 2. Emit to all participant user rooms (clears unread count, updates checkmarks across all tabs/devices)
    for (const room of targetRoomSet) {
      this.server.to(room).emit('messages_read', payload);
    }

    this.logger.log(
      `Broadcast read receipt for message #${messageId} by ${readerUserId} to room ${bookingRoom} and ${targetRoomSet.size} user rooms`,
    );
  }

  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(@ConnectedSocket() client: Socket): Promise<UnreadCountResponseDto> {
    const userId = client.data.userId;
    if (!userId) return { unreadCount: 0 };
    return this.notificationService.getUnreadCount(userId);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(@ConnectedSocket() client: Socket, @MessageBody() data: { id: string }) {
    const userId = client.data.userId;
    if (!userId || !data?.id) return;
    const result = await this.notificationService.markAsRead(userId, data.id);
    this.broadcastUnreadCount(userId, result.unreadCount);
    this.server.to(`user:${userId}`).emit('notification_read', {
      id: data.id,
      readAt: result.readAt,
      unreadCount: result.unreadCount,
    });
  }

  @SubscribeMessage('mark_all_as_read')
  async handleMarkAllAsRead(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;
    const result = await this.notificationService.markAllAsRead(userId);
    this.broadcastUnreadCount(userId, result.unreadCount);
    this.server.to(`user:${userId}`).emit('notifications_all_read', { unreadCount: 0 });
  }

  /**
   * Real-time Chat Room Subscriptions:
   * Client joins booking_chat:${bookingId} after server-side ABAC authorization verification.
   */
  @SubscribeMessage('join_booking_chat')
  async handleJoinBookingChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !data?.bookingId) {
      return { success: false, error: 'Unauthorized or missing bookingId' };
    }

    if (!this.bookingRepo) {
      const room = `booking_chat:${data.bookingId}`;
      await client.join(room);
      return { success: true, bookingId: data.bookingId };
    }

    const booking = await this.bookingRepo.findOne({
      where: { id: data.bookingId },
      relations: { tutorProfile: true },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }

    // ABAC verification (handles tutorProfile.userId fallback as well)
    const isStudent = userId === booking.studentUserId;
    const isRequester = userId === booking.requesterUserId;
    const isTutor =
      userId === booking.tutorUserId ||
      (booking.tutorProfile && (booking.tutorProfile as unknown as { userId?: string }).userId === userId);

    let isGuardian = false;
    if (!isStudent && !isRequester && !isTutor && this.guardianAccess) {
      const activeGuardianIds = await this.guardianAccess.findActiveGuardianIds(
        booking.studentUserId,
      );
      isGuardian = activeGuardianIds.includes(userId);
    }

    const userRoles: string[] = Array.isArray(client.data.roles) ? client.data.roles : [];
    const isAdmin = userRoles.some((r) => ['admin', 'super_admin', 'staff'].includes(r));

    if (!isStudent && !isRequester && !isTutor && !isGuardian && !isAdmin) {
      this.logger.warn(
        `User ${userId} denied joining chat room for booking ${data.bookingId} (not a participant)`,
      );
      return { success: false, error: 'Forbidden: You are not a participant in this booking' };
    }

    const room = `booking_chat:${data.bookingId}`;
    await client.join(room);
    this.logger.log(
      isAdmin
        ? `Admin/staff user ${userId} joined real-time chat room ${room} for oversight`
        : `User ${userId} joined real-time chat room ${room}`,
    );
    return { success: true, bookingId: data.bookingId };
  }

  @SubscribeMessage('leave_booking_chat')
  async handleLeaveBookingChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    if (!data?.bookingId) return { success: false };
    const room = `booking_chat:${data.bookingId}`;
    await client.leave(room);
    this.logger.log(`User ${client.data?.userId} left real-time chat room ${room}`);
    return { success: true, bookingId: data.bookingId };
  }

  @SubscribeMessage('chat_typing')
  handleChatTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string; isTyping: boolean; userName?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !data?.bookingId) return;
    const room = `booking_chat:${data.bookingId}`;
    // Broadcast typing indicator to other participants in the room
    client.to(room).emit('user_typing', {
      bookingId: data.bookingId,
      userId,
      userName: data.userName || 'Participant',
      isTyping: Boolean(data.isTyping),
    });
  }
}
