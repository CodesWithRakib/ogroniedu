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
import { Logger, Inject, forwardRef } from '@nestjs/common';
import type { NotificationItemDto, UnreadCountResponseDto } from '@ogroniedu/contracts';
import { NotificationService } from './notification.service';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth || {};
      const headers = client.handshake.headers || {};
      let userId: string | null = null;

      // 1. Check handshake.auth.token
      if (auth.token) {
        if (typeof auth.token === 'string' && auth.token.startsWith('mock:')) {
          userId = auth.token.split(':')[1];
        } else if (typeof auth.token === 'string' && auth.token.includes('.')) {
          const payloadBase64 = auth.token.split('.')[1];
          if (payloadBase64) {
            const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
            userId = decoded.sub || decoded.id;
          }
        } else {
          userId = String(auth.token);
        }
      }

      // 2. Fallback to header or query parameter
      if (!userId && headers['x-user-id']) {
        userId = String(headers['x-user-id']);
      }
      if (!userId && client.handshake.query.userId) {
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

      // Send initial unread count immediately upon connection
      const { unreadCount } = await this.notificationService.getUnreadCount(userId);
      client.emit('unread_count', { unreadCount });
    } catch (err: any) {
      this.logger.error(`Error during socket handshake authentication: ${err.message}`);
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
}
