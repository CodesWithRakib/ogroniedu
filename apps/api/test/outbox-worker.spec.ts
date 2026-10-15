import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutboxWorkerService } from '../src/modules/notifications/outbox-worker.service';

describe('OutboxWorkerService Unit & Business Invariant Tests (Phase 12)', () => {
  let worker: OutboxWorkerService;
  let mockOutboxRepo: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockOutboxRepo = {
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    worker = new OutboxWorkerService(mockOutboxRepo, mockNotificationService);
  });

  it('should process pending outbox event and mark publishedAt', async () => {
    const sampleEvent: any = {
      id: 'out-1',
      aggregateType: 'booking',
      aggregateId: '00000000-0000-4000-8000-000000000001',
      eventType: 'booking.requested',
      payload: {
        tutorUserId: '00000000-0000-4000-8000-000000000002',
        subjectName: 'Chemistry',
        requesterName: 'Amina',
      },
      attempts: 0,
      createdAt: new Date(Date.now() - 5000),
      publishedAt: null,
      lastErrorCode: null,
    };

    mockOutboxRepo.find.mockResolvedValue([sampleEvent]);

    const result = await worker.processPendingEvents();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'booking.requested',
        recipientRole: 'tutor',
      }),
    );
    expect(sampleEvent.publishedAt).toBeInstanceOf(Date);
    expect(mockOutboxRepo.save).toHaveBeenCalledWith(sampleEvent);
  });

  it('DEFINITION OF DONE INVARIANT: delivery failure cannot corrupt committed business state', async () => {
    const sampleEvent: any = {
      id: 'out-2',
      aggregateType: 'payment_order',
      aggregateId: '00000000-0000-4000-8000-000000000010',
      eventType: 'payment.succeeded',
      payload: {
        studentUserId: '00000000-0000-4000-8000-000000000011',
        amount: '1000.00',
      },
      attempts: 0,
      createdAt: new Date(Date.now() - 5000),
      publishedAt: null,
      lastErrorCode: null,
    };

    mockOutboxRepo.find.mockResolvedValue([sampleEvent]);
    // Simulate notification transport/network failure
    mockNotificationService.dispatch.mockRejectedValue(
      new Error('Connection timeout to upstream push provider: secret_token_xyz123456789'),
    );

    const result = await worker.processPendingEvents();

    // Outbox worker handles error gracefully: records retry, does not crash
    expect(result.processed).toBe(1);
    expect(result.retried).toBe(1);
    expect(sampleEvent.attempts).toBe(1);
    expect(sampleEvent.publishedAt).toBeNull();

    // Sanitized & redacted error message
    expect(sampleEvent.lastErrorCode).toContain('[REDACTED_SECRET]');
    expect(sampleEvent.lastErrorCode).not.toContain('secret_token_xyz123456789');

    // Committed business state (e.g. payment_order) is not rolled back or affected
    expect(mockOutboxRepo.save).toHaveBeenCalledWith(sampleEvent);
  });

  it('EXPONENTIAL BACKOFF: should skip event if retry interval has not elapsed', async () => {
    const freshRetryEvent: any = {
      id: 'out-3',
      aggregateType: 'booking',
      aggregateId: '00000000-0000-4000-8000-000000000001',
      eventType: 'booking.requested',
      payload: { tutorUserId: 'user-2' },
      attempts: 2, // 2^2 * 1000 = 4000ms backoff required
      createdAt: new Date(Date.now() - 1000), // Only 1 second ago!
      publishedAt: null,
    };

    mockOutboxRepo.find.mockResolvedValue([freshRetryEvent]);

    const result = await worker.processPendingEvents();

    // Skipped processing until window expires
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(mockNotificationService.dispatch).not.toHaveBeenCalled();
  });

  it('MAX RETRIES: should mark event failed when maximum attempts exceeded', async () => {
    const exhaustedEvent: any = {
      id: 'out-4',
      aggregateType: 'booking',
      aggregateId: '00000000-0000-4000-8000-000000000001',
      eventType: 'booking.requested',
      payload: { tutorUserId: 'user-2' },
      attempts: 5,
      createdAt: new Date(Date.now() - 60000),
      publishedAt: null,
    };

    mockOutboxRepo.find.mockResolvedValue([exhaustedEvent]);

    const result = await worker.processPendingEvents();

    expect(result.failed).toBe(1);
    expect(exhaustedEvent.lastErrorCode).toBe('MAX_RETRIES_EXCEEDED');
    expect(mockOutboxRepo.save).toHaveBeenCalledWith(exhaustedEvent);
  });
});
