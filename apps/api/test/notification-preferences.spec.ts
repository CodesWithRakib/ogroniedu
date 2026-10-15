import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '../src/modules/notifications/notification.service';
import { NotificationPreferencesService } from '../src/modules/notifications/notification-preferences.service';

describe('Notification Preferences & Channel Suppression Tests (Phase 12)', () => {
  let service: NotificationService;
  let mockNotifRepo: any;
  let mockDeliveryRepo: any;
  let mockGateway: any;
  let mockPreferenceRepo: any;

  const testUserId = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    mockNotifRepo = {
      save: vi.fn((entity) => Promise.resolve(entity)),
      find: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      })),
    };

    mockDeliveryRepo = {
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    mockGateway = {
      sendToUser: vi.fn(),
    };

    mockPreferenceRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((data) => ({ id: 'pref-1', ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'pref-1', ...entity })),
    };

    service = new NotificationService(
      mockNotifRepo,
      mockDeliveryRepo,
      mockGateway,
      new NotificationPreferencesService(mockPreferenceRepo),
    );
  });

  it('should retrieve preferences for authenticated user', async () => {
    const samplePref: any = {
      id: 'pref-1',
      userId: testUserId,
      category: 'booking',
      channel: 'sms',
      isEnabled: false,
    };
    mockPreferenceRepo.find.mockResolvedValue([samplePref]);

    const prefs = await service.getPreferences(testUserId);
    expect(prefs).toHaveLength(1);
    expect(prefs[0].category).toBe('booking');
    expect(prefs[0].isEnabled).toBe(false);
  });

  it('should update and persist user preferences', async () => {
    const updated = await service.updatePreferences(testUserId, {
      preferences: [
        { category: 'marketing', channel: 'email', isEnabled: false },
        { category: 'booking', channel: 'push', isEnabled: true },
      ],
    });

    expect(updated).toHaveLength(2);
    expect(mockPreferenceRepo.save).toHaveBeenCalledTimes(2);
  });

  it('CHANNEL SUPPRESSION: should suppress in-app delivery and skip socket push when category is disabled', async () => {
    // Mock user having disabled 'booking' category on 'in_app' channel
    mockPreferenceRepo.findOne.mockResolvedValue({
      id: 'pref-1',
      userId: testUserId,
      category: 'booking',
      channel: 'in_app',
      isEnabled: false,
    });

    const res = await service.dispatch({
      userId: testUserId,
      recipientRole: 'student',
      eventType: 'booking.accepted',
      payload: { bookingId: 'b-1', tutorName: 'Dr. Rahim', subjectName: 'Physics' },
    });

    expect(res).toBeDefined();
    // Delivery record saved with 'suppressed' status
    expect(mockDeliveryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'in_app',
        status: 'suppressed',
        deliveredAt: null,
      }),
    );

    // Socket gateway push MUST be skipped when suppressed
    expect(mockGateway.sendToUser).not.toHaveBeenCalled();
  });

  it('INVARIANT: delivery suppression must never fail or roll back the business dispatch operation', async () => {
    mockPreferenceRepo.findOne.mockResolvedValue({
      id: 'pref-2',
      userId: testUserId,
      category: 'booking',
      channel: 'in_app',
      isEnabled: false,
    });

    await expect(
      service.dispatch({
        userId: testUserId,
        recipientRole: 'tutor',
        eventType: 'booking.requested',
        payload: { bookingId: 'b-2', requesterName: 'Karim', subjectName: 'Math' },
      }),
    ).resolves.toBeDefined();
  });
});
