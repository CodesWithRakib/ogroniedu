import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  DispatchNotificationDto,
  GetNotificationsQueryDto,
  MarkAsReadParamDto,
} from '../src/modules/notifications/dto';

describe('Notification DTO Validation & Transformation Tests', () => {
  describe('DispatchNotificationDto', () => {
    it('should validate successfully with valid fields', async () => {
      const plain = {
        userId: '11111111-1111-4111-a111-111111111111',
        eventType: 'booking.requested',
        recipientRole: 'tutor',
        payload: { bookingId: 'BK-100', requesterName: 'Rahim' },
        idempotencyKey: 'key-123',
      };

      const dto = plainToInstance(DispatchNotificationDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.userId).toBe(plain.userId);
      expect(dto.eventType).toBe('booking.requested');
    });

    it('NEGATIVE TEST: should reject non-UUID userId', async () => {
      const plain = {
        userId: 'not-a-valid-uuid',
        eventType: 'booking.requested',
        recipientRole: 'tutor',
        payload: {},
      };

      const dto = plainToInstance(DispatchNotificationDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const userIdError = errors.find((e) => e.property === 'userId');
      expect(userIdError).toBeDefined();
      expect(userIdError?.constraints?.isUuid).toBeDefined();
    });

    it('NEGATIVE TEST: should reject unregistered eventType', async () => {
      const plain = {
        userId: '11111111-1111-4111-a111-111111111111',
        eventType: 'unknown.invalid_event',
        recipientRole: 'tutor',
        payload: {},
      };

      const dto = plainToInstance(DispatchNotificationDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const eventError = errors.find((e) => e.property === 'eventType');
      expect(eventError).toBeDefined();
      expect(eventError?.constraints?.isIn).toBeDefined();
    });

    it('NEGATIVE TEST: should reject invalid recipientRole', async () => {
      const plain = {
        userId: '11111111-1111-4111-a111-111111111111',
        eventType: 'booking.requested',
        recipientRole: 'hacker',
        payload: {},
      };

      const dto = plainToInstance(DispatchNotificationDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const roleError = errors.find((e) => e.property === 'recipientRole');
      expect(roleError).toBeDefined();
      expect(roleError?.constraints?.isIn).toBeDefined();
    });

    it('NEGATIVE TEST: should reject non-object payload', async () => {
      const plain = {
        userId: '11111111-1111-4111-a111-111111111111',
        eventType: 'booking.requested',
        recipientRole: 'tutor',
        payload: 'not-an-object',
      };

      const dto = plainToInstance(DispatchNotificationDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const payloadError = errors.find((e) => e.property === 'payload');
      expect(payloadError).toBeDefined();
    });
  });

  describe('GetNotificationsQueryDto', () => {
    it('should transform and accept string query parameters correctly', async () => {
      const plain = {
        unreadOnly: 'true',
        limit: '15',
        page: '3',
        locale: 'en',
      };

      const dto = plainToInstance(GetNotificationsQueryDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.unreadOnly).toBe(true);
      expect(dto.limit).toBe(15);
      expect(dto.page).toBe(3);
      expect(dto.locale).toBe('en');
    });

    it('should use default values when omitted', async () => {
      const dto = plainToInstance(GetNotificationsQueryDto, {});
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.unreadOnly).toBe(false);
      expect(dto.limit).toBe(20);
      expect(dto.page).toBe(1);
      expect(dto.locale).toBe('bn');
    });

    it('NEGATIVE TEST: should reject limit greater than 100', async () => {
      const plain = { limit: '250' };
      const dto = plainToInstance(GetNotificationsQueryDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const limitError = errors.find((e) => e.property === 'limit');
      expect(limitError).toBeDefined();
      expect(limitError?.constraints?.max).toBeDefined();
    });

    it('NEGATIVE TEST: should reject unsupported locale', async () => {
      const plain = { locale: 'es' };
      const dto = plainToInstance(GetNotificationsQueryDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const localeError = errors.find((e) => e.property === 'locale');
      expect(localeError).toBeDefined();
      expect(localeError?.constraints?.isIn).toBeDefined();
    });
  });

  describe('MarkAsReadParamDto', () => {
    it('should accept valid UUID v4', async () => {
      const plain = { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' };
      const dto = plainToInstance(MarkAsReadParamDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBe(0);
      expect(dto.id).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    });

    it('NEGATIVE TEST: should reject invalid UUID parameter', async () => {
      const plain = { id: 'invalid-id-123' };
      const dto = plainToInstance(MarkAsReadParamDto, plain);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const idError = errors.find((e) => e.property === 'id');
      expect(idError).toBeDefined();
      expect(idError?.constraints?.isUuid).toBeDefined();
    });
  });
});
