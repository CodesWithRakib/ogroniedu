import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  NotificationCategoryType,
  NotificationChannelType,
} from './entities/notification-preference.entity';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { UpdateNotificationPreferencesDto } from './dto';
import { NotificationCategories } from '@ogroniedu/contracts';
import type { NotificationCategory } from '@ogroniedu/contracts';

/** Category/channel unions are validated at the entity boundary. */
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

/**
 * Notification preferences + channel suppression (Phase 23 P1-4b slice).
 * Extracted from NotificationService so preference rules evolve without
 * touching dispatch/read paths. Keeps the same in-memory fallback for
 * test isolation when no repository is provided.
 */
@Injectable()
export class NotificationPreferencesService {
  private memoryPreferences: NotificationPreferenceEntity[] = [];

  constructor(
    @Optional()
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferenceRepo?: Repository<NotificationPreferenceEntity>,
  ) {}

  /** Retrieve notification preferences for user. */
  async getPreferences(userId: string): Promise<NotificationPreferenceEntity[]> {
    if (this.preferenceRepo) {
      return this.preferenceRepo.find({ where: { userId } });
    }
    return this.memoryPreferences.filter((p) => p.userId === userId);
  }

  /** Update notification preferences for user. */
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

  /** True when the user disabled a category+channel (dispatch must skip push). */
  async isChannelSuppressed(
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
