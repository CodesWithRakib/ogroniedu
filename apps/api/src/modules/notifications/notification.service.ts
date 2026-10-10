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
import { getNotificationDefinition, interpolateTemplate } from '@ogroniedu/contracts';
import type {
  NotificationItemDto,
  NotificationsListResponseDto,
  UnreadCountResponseDto,
  MarkAsReadResponseDto,
  MarkAllAsReadResponseDto,
} from '@ogroniedu/contracts';
import {
  DispatchNotificationDto,
  GetNotificationsQueryDto,
  UpdateNotificationPreferencesDto,
} from './dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationDeliveryEntity } from './entities/notification-delivery.entity';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { NotificationGateway } from './notification.gateway';
import { Optional } from '@nestjs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // In-memory fallback stores for test isolation and quick local bootstrapping
  private memoryNotifications: NotificationEntity[] = [];
  private memoryDeliveries: NotificationDeliveryEntity[] = [];
  private memoryPreferences: NotificationPreferenceEntity[] = [];

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(NotificationDeliveryEntity)
    private readonly deliveryRepo: Repository<NotificationDeliveryEntity>,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly gateway: NotificationGateway,
    @Optional()
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferenceRepo?: Repository<NotificationPreferenceEntity>,
  ) {}

  /**
   * Dispatch a notification using the Centralized Notification Registry
   */
  async dispatch(dto: DispatchNotificationDto): Promise<NotificationItemDto> {
    const def = getNotificationDefinition(dto.eventType);

    // 1. Recipient Eligibility & Role Validation
    if (!def.allowedRoles.includes(dto.recipientRole as any)) {
      throw new ForbiddenException(
        `Role '${dto.recipientRole}' is not eligible to receive notification type '${dto.eventType}'`,
      );
    }

    // 2. Persist notification to database (or memory fallback)
    const notification = new NotificationEntity();
    notification.id = crypto.randomUUID();
    notification.userId = dto.userId;
    notification.eventType = dto.eventType;
    notification.titleKey = def.titleKey;
    notification.bodyKey = def.bodyKey;
    notification.payload = dto.payload || {};
    notification.readAt = null;
    notification.createdAt = new Date();

    if (this.notificationRepo) {
      try {
        await this.notificationRepo.save(notification);
      } catch (err: any) {
        this.logger.warn(`DB save fallback to in-memory: ${err.message}`);
        this.memoryNotifications.push(notification);
      }
    } else {
      this.memoryNotifications.push(notification);
    }

    // Check user preference for category on in_app channel
    const isSuppressed = await this.isChannelSuppressed(dto.userId, def.category, 'in_app');

    // 3. Persist delivery record for in_app channel
    const delivery = new NotificationDeliveryEntity();
    delivery.id = crypto.randomUUID();
    delivery.notificationId = notification.id;
    delivery.channel = 'in_app';
    delivery.provider = 'socket.io';
    delivery.status = isSuppressed ? 'suppressed' : 'delivered';
    delivery.attempts = 1;
    delivery.sentAt = new Date();
    delivery.deliveredAt = isSuppressed ? null : new Date();
    delivery.createdAt = new Date();

    if (this.deliveryRepo) {
      try {
        await this.deliveryRepo.save(delivery);
      } catch (err: any) {
        this.memoryDeliveries.push(delivery);
      }
    } else {
      this.memoryDeliveries.push(delivery);
    }

    // 4. Calculate current unread count
    const { unreadCount } = await this.getUnreadCount(dto.userId);

    // 5. Format localized notification item (default Bengali, supports English)
    const itemDto = this.formatNotificationItem(notification, 'bn');

    // 6. Real-time push through Socket.IO Gateway (if not suppressed)
    if (this.gateway && !isSuppressed) {
      try {
        this.gateway.sendToUser(dto.userId, itemDto, unreadCount);
      } catch (err: any) {
        this.logger.warn(`Gateway dispatch error: ${err.message}`);
      }
    }

    this.logger.log(
      `Dispatched notification ${dto.eventType} to user ${dto.userId}${isSuppressed ? ' [SUPPRESSED BY USER PREFERENCE]' : ''}`,
    );
    return itemDto;
  }

  /**
   * Retrieve paginated notifications for a specific user
   */
  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const locale = query.locale || 'bn';
    const limit = query.limit || 20;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    let items: NotificationEntity[] = [];
    let total = 0;

    if (this.notificationRepo) {
      try {
        const queryBuilder = this.notificationRepo
          .createQueryBuilder('n')
          .where('n.user_id = :userId', { userId });

        if (query.unreadOnly) {
          queryBuilder.andWhere('n.read_at IS NULL');
        }

        queryBuilder.orderBy('n.created_at', 'DESC').skip(skip).take(limit);

        const [results, count] = await queryBuilder.getManyAndCount();
        items = results;
        total = count;
      } catch (err: any) {
        // Fallback to in-memory store
        const userItems = this.memoryNotifications.filter((n) => n.userId === userId);
        const filtered = query.unreadOnly ? userItems.filter((n) => !n.readAt) : userItems;
        total = filtered.length;
        items = filtered.slice(skip, skip + limit);
      }
    } else {
      const userItems = this.memoryNotifications.filter((n) => n.userId === userId);
      const filtered = query.unreadOnly ? userItems.filter((n) => !n.readAt) : userItems;
      total = filtered.length;
      items = filtered.slice(skip, skip + limit);
    }

    const { unreadCount } = await this.getUnreadCount(userId);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.formatNotificationItem(item, locale)),
      total,
      unreadCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
    };
  }

  /**
   * Fast unread count query
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    if (this.notificationRepo) {
      try {
        const count = await this.notificationRepo.count({
          where: {
            userId,
            readAt: null as any,
          },
        });
        return { unreadCount: count };
      } catch (err: any) {
        const count = this.memoryNotifications.filter(
          (n) => n.userId === userId && !n.readAt,
        ).length;
        return { unreadCount: count };
      }
    }

    const count = this.memoryNotifications.filter((n) => n.userId === userId && !n.readAt).length;
    return { unreadCount: count };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<MarkAsReadResponseDto> {
    const readAt = new Date();

    if (this.notificationRepo) {
      try {
        const notification = await this.notificationRepo.findOne({
          where: { id: notificationId, userId },
        });

        if (!notification) {
          throw new NotFoundException(`Notification with ID ${notificationId} not found`);
        }

        notification.readAt = readAt;
        await this.notificationRepo.save(notification);
      } catch (err: any) {
        const memoryItem = this.memoryNotifications.find(
          (n) => n.id === notificationId && n.userId === userId,
        );
        if (memoryItem) {
          memoryItem.readAt = readAt;
        } else {
          throw new NotFoundException(`Notification with ID ${notificationId} not found`);
        }
      }
    } else {
      const memoryItem = this.memoryNotifications.find(
        (n) => n.id === notificationId && n.userId === userId,
      );
      if (memoryItem) {
        memoryItem.readAt = readAt;
      } else {
        throw new NotFoundException(`Notification with ID ${notificationId} not found`);
      }
    }

    const { unreadCount } = await this.getUnreadCount(userId);
    return {
      id: notificationId,
      readAt: readAt.toISOString(),
      unreadCount,
    };
  }

  /**
   * Mark all unread notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<MarkAllAsReadResponseDto> {
    const readAt = new Date();
    let markedCount = 0;

    if (this.notificationRepo) {
      try {
        const result = await this.notificationRepo
          .createQueryBuilder()
          .update(NotificationEntity)
          .set({ readAt })
          .where('user_id = :userId AND read_at IS NULL', { userId })
          .execute();

        markedCount = result.affected || 0;
      } catch (err: any) {
        const unreadItems = this.memoryNotifications.filter(
          (n) => n.userId === userId && !n.readAt,
        );
        unreadItems.forEach((n) => (n.readAt = readAt));
        markedCount = unreadItems.length;
      }
    } else {
      const unreadItems = this.memoryNotifications.filter((n) => n.userId === userId && !n.readAt);
      unreadItems.forEach((n) => (n.readAt = readAt));
      markedCount = unreadItems.length;
    }

    return {
      markedCount,
      unreadCount: 0,
    };
  }

  /**
   * Helper to format database entity into client DTO with localized text
   */
  private formatNotificationItem(
    entity: NotificationEntity,
    locale: 'bn' | 'en' = 'bn',
  ): NotificationItemDto {
    const def = getNotificationDefinition(entity.eventType as any);
    const template = locale === 'en' ? def.templateEn : def.templateBn;

    const payload = entity.payload as Record<string, string | number>;
    const title = interpolateTemplate(template.title, payload);
    const body = interpolateTemplate(template.body, payload);
    const navigationTarget = interpolateTemplate(def.navigationTarget, payload);

    return {
      id: entity.id,
      userId: entity.userId,
      eventType: entity.eventType as any,
      title,
      body,
      titleKey: entity.titleKey,
      bodyKey: entity.bodyKey,
      category: def.category,
      priority: def.priority,
      navigationTarget,
      payload: entity.payload,
      readAt: entity.readAt ? entity.readAt.toISOString() : null,
      isRead: !!entity.readAt,
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Retrieve notification preferences for user
   */
  async getPreferences(userId: string): Promise<NotificationPreferenceEntity[]> {
    if (this.preferenceRepo) {
      return this.preferenceRepo.find({ where: { userId } });
    }
    return this.memoryPreferences.filter((p) => p.userId === userId);
  }

  /**
   * Update notification preferences for user
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceEntity[]> {
    const updated: NotificationPreferenceEntity[] = [];

    for (const item of dto.preferences) {
      if (this.preferenceRepo) {
        let pref = await this.preferenceRepo.findOne({
          where: { userId, category: item.category, channel: item.channel },
        });
        if (!pref) {
          pref = this.preferenceRepo.create({
            userId,
            category: item.category,
            channel: item.channel,
            isEnabled: item.isEnabled,
          });
        } else {
          pref.isEnabled = item.isEnabled;
          pref.updatedAt = new Date();
        }
        const saved = await this.preferenceRepo.save(pref);
        updated.push(saved);
      } else {
        const existingIdx = this.memoryPreferences.findIndex(
          (p) => p.userId === userId && p.category === item.category && p.channel === item.channel,
        );
        if (existingIdx >= 0) {
          this.memoryPreferences[existingIdx].isEnabled = item.isEnabled;
          this.memoryPreferences[existingIdx].updatedAt = new Date();
          updated.push(this.memoryPreferences[existingIdx]);
        } else {
          const newPref = new NotificationPreferenceEntity();
          newPref.id = crypto.randomUUID();
          newPref.userId = userId;
          newPref.category = item.category;
          newPref.channel = item.channel;
          newPref.isEnabled = item.isEnabled;
          newPref.createdAt = new Date();
          newPref.updatedAt = new Date();
          this.memoryPreferences.push(newPref);
          updated.push(newPref);
        }
      }
    }

    return updated;
  }

  /**
   * Helper to check if a specific category & channel is disabled by user
   */
  private async isChannelSuppressed(
    userId: string,
    category: string,
    channel: string,
  ): Promise<boolean> {
    if (this.preferenceRepo) {
      const pref = await this.preferenceRepo.findOne({
        where: { userId, category: category as any, channel: channel as any },
      });
      return pref ? !pref.isEnabled : false;
    }
    const memPref = this.memoryPreferences.find(
      (p) => p.userId === userId && p.category === category && p.channel === channel,
    );
    return memPref ? !memPref.isEnabled : false;
  }
}
