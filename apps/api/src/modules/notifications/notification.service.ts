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
import {
  getNotificationDefinition,
  interpolateTemplate,
  NotificationCategories,
  NotificationEventTypes,
  type NotificationCategory,
  type NotificationEventType,
} from '@ogroniedu/contracts';
import { readErrorMessage } from '../../common/errors/error-message';
import type {
  NotificationCategoryType,
  NotificationChannelType,
} from './entities/notification-preference.entity';

/** Entity event_type is stored as text; narrow to the registry union at read time. */
function readEventType(value: string): NotificationEventType {
  return (NotificationEventTypes as readonly string[]).includes(value)
    ? (value as NotificationEventType)
    : 'booking.requested';
}

/** Preference category/channel are validated unions at the entity boundary. */
function readCategory(value: string): NotificationCategoryType {
  return (NotificationCategories as readonly string[]).includes(value)
    ? (value as NotificationCategoryType)
    : 'system';
}

function readChannel(value: string): NotificationChannelType {
  return value === 'email' || value === 'sms' || value === 'push' || value === 'whatsapp'
    ? value
    : 'in_app';
}
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
  resolveNotificationsOffsetLimit,
} from './dto';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationDeliveryEntity } from './entities/notification-delivery.entity';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { NotificationGateway } from './notification.gateway';
import { Optional } from '@nestjs/common';
import { decodeCursor, encodeCursor, type CursorPayload } from '../../common/pagination/pagination';

/** Default cursor page size for the notifications feed. */
const DEFAULT_NOTIFICATIONS_CURSOR_PAGE_SIZE = 20;

/** Epoch millis for a notification timestamp (entity or ISO string at runtime). */
function notificationTime(value: Date): number {
  return value instanceof Date ? value.getTime() : Date.parse(String(value));
}

/** ISO timestamp for a notification edge (entity or ISO string at runtime). */
function notificationIso(value: Date): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(Date.parse(String(value))).toISOString();
}

/** Deterministic feed order: (created_at DESC, id DESC). */
function compareNotificationsDesc(a: NotificationEntity, b: NotificationEntity): number {
  const ta = notificationTime(a.createdAt);
  const tb = notificationTime(b.createdAt);
  if (ta !== tb) return tb - ta;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

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
    if (!def.allowedRoles.includes(dto.recipientRole)) {
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
      } catch (err: unknown) {
        this.logger.warn(`DB save fallback to in-memory: ${readErrorMessage(err)}`);
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
      } catch {
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
      } catch (err: unknown) {
        this.logger.warn(`Gateway dispatch error: ${readErrorMessage(err)}`);
      }
    }

    this.logger.log(
      `Dispatched notification ${dto.eventType} to user ${dto.userId}${isSuppressed ? ' [SUPPRESSED BY USER PREFERENCE]' : ''}`,
    );
    return itemDto;
  }

  /**
   * Retrieve paginated notifications for a specific user.
   * Legacy mode (no cursor): offset page/limit behavior identical to before,
   * plus canonical `success/data/meta` envelope fields.
   * Cursor mode: append-heavy feed ordered (created_at DESC, id DESC);
   * `page/limit/totalPages` are omitted and cursor `meta.pagination` is
   * returned instead. `unreadOnly`/locale filters apply before pagination
   * in both modes.
   */
  async getNotifications(
    userId: string,
    query: GetNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    const locale = query.locale || 'bn';
    const cursor = decodeCursor(query.cursor);
    if (cursor) {
      return this.getNotificationsCursorPage(userId, query, cursor, locale);
    }

    const limit = resolveNotificationsOffsetLimit(query);
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
      } catch {
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
    const hasNextPage = page < totalPages;
    const formatted = items.map((item) => this.formatNotificationItem(item, locale));

    return {
      items: formatted,
      total,
      unreadCount,
      page,
      limit,
      totalPages,
      hasNextPage,
      success: true,
      data: formatted,
      meta: {
        pagination: {
          strategy: 'offset',
          page,
          pageSize: limit,
          totalItems: total,
          totalPages,
          hasNextPage,
          hasPreviousPage: page > 1,
        },
      },
    };
  }

  /**
   * Cursor-backward page for the notifications feed. `total` counts every
   * matching notification (filters applied, pagination ignored); `totalPages`
   * is never emitted here.
   */
  private async getNotificationsCursorPage(
    userId: string,
    query: GetNotificationsQueryDto,
    cursor: CursorPayload,
    locale: 'bn' | 'en',
  ): Promise<NotificationsListResponseDto> {
    const pageSize = query.pageSize ?? DEFAULT_NOTIFICATIONS_CURSOR_PAGE_SIZE;

    let rows: NotificationEntity[] = [];
    let total = 0;
    let loadedFromDb = false;

    if (this.notificationRepo) {
      try {
        const countQuery = this.notificationRepo
          .createQueryBuilder('n')
          .where('n.user_id = :userId', { userId });
        if (query.unreadOnly) {
          countQuery.andWhere('n.read_at IS NULL');
        }
        total = await countQuery.getCount();

        const rowsQuery = this.notificationRepo
          .createQueryBuilder('n')
          .where('n.user_id = :userId', { userId });
        if (query.unreadOnly) {
          rowsQuery.andWhere('n.read_at IS NULL');
        }
        rowsQuery.andWhere(
          '(n.created_at < :cursorTime OR (n.created_at = :cursorTime AND n.id < :cursorId))',
          { cursorTime: cursor.t, cursorId: cursor.id },
        );
        rows = await rowsQuery
          .orderBy('n.created_at', 'DESC')
          .addOrderBy('n.id', 'DESC')
          .take(pageSize + 1)
          .getMany();
        loadedFromDb = true;
      } catch {
        // Fallback to in-memory store below.
      }
    }

    if (!loadedFromDb) {
      const cursorTime = Date.parse(cursor.t);
      const owned = this.memoryNotifications.filter((n) => n.userId === userId);
      const filtered = query.unreadOnly ? owned.filter((n) => !n.readAt) : owned;
      total = filtered.length;
      rows = filtered
        .filter((n) => {
          const t = notificationTime(n.createdAt);
          return t < cursorTime || (t === cursorTime && n.id < cursor.id);
        })
        .sort(compareNotificationsDesc)
        .slice(0, pageSize + 1);
    }

    const hasNextPage = rows.length > pageSize;
    const page = hasNextPage ? rows.slice(0, pageSize) : rows;
    const formatted = page.map((item) => this.formatNotificationItem(item, locale));
    const { unreadCount } = await this.getUnreadCount(userId);
    const oldest = page.length > 0 ? page[page.length - 1] : undefined;
    const nextCursor =
      hasNextPage && oldest
        ? encodeCursor({ t: notificationIso(oldest.createdAt), id: oldest.id })
        : null;

    return {
      items: formatted,
      total,
      unreadCount,
      hasNextPage,
      success: true,
      data: formatted,
      meta: {
        pagination: {
          strategy: 'cursor',
          nextCursor,
          previousCursor: null,
          hasNextPage,
          pageSize,
        },
      },
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
            readAt: IsNull(),
          },
        });
        return { unreadCount: count };
      } catch {
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
      } catch {
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
      } catch {
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
    const def = getNotificationDefinition(readEventType(entity.eventType));
    const template = locale === 'en' ? def.templateEn : def.templateBn;

    const payload = entity.payload as Record<string, string | number>;
    const title = interpolateTemplate(template.title, payload);
    const body = interpolateTemplate(template.body, payload);
    const navigationTarget = interpolateTemplate(def.navigationTarget, payload);

    return {
      id: entity.id,
      userId: entity.userId,
      eventType: readEventType(entity.eventType),
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
    category: NotificationCategory,
    channel: NotificationChannelType,
  ): Promise<boolean> {
    if (this.preferenceRepo) {
      const pref = await this.preferenceRepo.findOne({
        where: { userId, category: readCategory(category), channel: readChannel(channel) },
      });
      return pref ? !pref.isEnabled : false;
    }
    const memPref = this.memoryPreferences.find(
      (p) => p.userId === userId && p.category === category && p.channel === channel,
    );
    return memPref ? !memPref.isEnabled : false;
  }
}
