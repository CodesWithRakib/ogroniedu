import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassroomService } from '../src/modules/classroom/services/classroom.service';
import type { IMediaProvider } from '../src/modules/classroom/interfaces/media-provider.interface';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ClassroomService Unit & Integration Tests', () => {
  let service: ClassroomService;
  let mockClassroomRepo: any;
  let mockAttendeeRepo: any;
  let mockEventRepo: any;
  let mockBookingSessionRepo: any;
  let mockLmsAttendanceRepo: any;
  let mockUserRepo: any;
  let mockMediaProvider: IMediaProvider;
  let mockConfig: any;
  let mockDataSource: any;

  const tutorUser: AuthenticatedUser = {
    id: 'tutor-user-uuid-1',
    roles: ['tutor'],
    email: 'tutor@ogroniedu.com',
  };

  const studentUser: AuthenticatedUser = {
    id: 'student-user-uuid-2',
    roles: ['student'],
    email: 'student@ogroniedu.com',
  };

  const strangerUser: AuthenticatedUser = {
    id: 'stranger-user-uuid-3',
    roles: ['student'],
    email: 'stranger@ogroniedu.com',
  };

  const guardianUser: AuthenticatedUser = {
    id: 'guardian-user-uuid-4',
    roles: ['guardian'],
    email: 'guardian@ogroniedu.com',
  };

  const now = new Date();
  const mockBookingSession = {
    id: 'session-uuid-101',
    bookingId: 'booking-uuid-201',
    tutorUserId: tutorUser.id,
    studentUserId: studentUser.id,
    startsAt: new Date(now.getTime() - 5 * 60 * 1000), // started 5 mins ago
    endsAt: new Date(now.getTime() + 55 * 60 * 1000), // ends in 55 mins
    status: 'scheduled',
    booking: {
      subject: { nameEn: 'Mathematics Higher Secondary' },
    },
  };

  beforeEach(() => {
    mockClassroomRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 'classroom-uuid-301', ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 'classroom-uuid-301', ...entity })),
    };

    mockAttendeeRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((dto) => ({ id: 'attendee-uuid-401', ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 'attendee-uuid-401', ...entity })),
    };

    mockEventRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 'event-uuid-501', ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 'event-uuid-501', ...entity })),
    };

    mockBookingSessionRepo = {
      findOne: vi.fn().mockResolvedValue({ ...mockBookingSession }),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    mockLmsAttendanceRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 'lms-att-uuid-601', ...dto })),
      save: vi.fn((entity) => Promise.resolve(entity)),
    };

    mockUserRepo = {
      findOne: vi.fn().mockResolvedValue({
        id: tutorUser.id,
        displayName: 'Farhan Tutor',
      }),
    };

    mockMediaProvider = {
      generateAccessToken: vi.fn().mockResolvedValue('mock-livekit-jwt-token-xyz'),
      updateParticipantPermissions: vi.fn().mockResolvedValue(undefined),
      muteParticipantTrack: vi.fn().mockResolvedValue(undefined),
      removeParticipant: vi.fn().mockResolvedValue(undefined),
      endRoom: vi.fn().mockResolvedValue(undefined),
      verifyWebhook: vi.fn().mockResolvedValue({
        event: 'participant_joined',
        id: 'webhook-evt-1',
        room: { name: 'ogroni-session-session-uuid-101' },
        participant: { identity: studentUser.id },
      }),
    };

    mockConfig = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'LIVEKIT_URL') return 'wss://ogroniedu-57i4qo5d.livekit.cloud';
        return defaultValue;
      }),
    };

    mockDataSource = {};

    service = new ClassroomService(
      mockClassroomRepo,
      mockAttendeeRepo,
      mockEventRepo,
      mockBookingSessionRepo,
      mockLmsAttendanceRepo,
      mockUserRepo,
      mockMediaProvider,
      mockDataSource,
      mockConfig,
    );
  });

  describe('Authorization & Join Eligibility', () => {
    it('TC-CLS-001: should allow authorized tutor to join and generate token with host grants', async () => {
      mockClassroomRepo.findOne.mockResolvedValue(null); // Will initialize
      mockAttendeeRepo.findOne.mockResolvedValue(null);

      const payload = await service.joinClassroom('session-uuid-101', tutorUser);

      expect(payload).toBeDefined();
      expect(payload.role).toBe('HOST');
      expect(payload.canPublish).toBe(true);
      expect(payload.canSubscribe).toBe(true);
      expect(payload.token).toBe('mock-livekit-jwt-token-xyz');
      expect(payload.serverUrl).toBe('wss://ogroniedu-57i4qo5d.livekit.cloud');
      expect(payload.roomName).toBe('ogroni-session-session-uuid-101');
      expect(mockMediaProvider.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          isHost: true,
          canPublish: true,
          participantIdentity: tutorUser.id,
        }),
      );
    });

    it('TC-CLS-002: should allow student in SMALL_GROUP mode to publish audio/video by default', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
        mode: 'SMALL_GROUP',
        status: 'LIVE',
        title: 'Math',
      });
      mockAttendeeRepo.findOne.mockResolvedValue(null);
      mockUserRepo.findOne.mockResolvedValue({
        id: studentUser.id,
        displayName: 'Abrar Student',
      });

      const payload = await service.joinClassroom('session-uuid-101', studentUser);

      expect(payload.role).toBe('STUDENT');
      expect(payload.canPublish).toBe(true);
      expect(mockMediaProvider.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          isHost: false,
          canPublish: true,
          participantIdentity: studentUser.id,
        }),
      );
    });

    it('TC-CLS-003: should restrict student in LARGE_BATCH mode to view-only (canPublish: false) unless stage promoted', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
        mode: 'LARGE_BATCH',
        status: 'LIVE',
        title: 'Batch Lecture',
      });
      mockAttendeeRepo.findOne.mockResolvedValue({
        isStagePromoted: false,
      });

      const payload = await service.joinClassroom('session-uuid-101', studentUser);

      expect(payload.role).toBe('STUDENT');
      expect(payload.canPublish).toBe(false);
      expect(payload.canSubscribe).toBe(true);
      expect(payload.canPublishData).toBe(true);
      expect(mockMediaProvider.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          canPublish: false,
          canSubscribe: true,
          canPublishData: true,
        }),
      );
    });

    it('TC-CLS-004: should reject unauthorized stranger with ForbiddenException', async () => {
      await expect(
        service.joinClassroom('session-uuid-101', strangerUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-CLS-005: should reject join if booking session has been cancelled', async () => {
      mockBookingSessionRepo.findOne.mockResolvedValue({
        ...mockBookingSession,
        status: 'cancelled',
      });

      await expect(
        service.joinClassroom('session-uuid-101', studentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-CLS-006: should reject early join if class starts in more than 15 minutes', async () => {
      mockBookingSessionRepo.findOne.mockResolvedValue({
        ...mockBookingSession,
        startsAt: new Date(Date.now() + 60 * 60 * 1000), // starts in 1 hour
        status: 'scheduled',
      });
      mockClassroomRepo.findOne.mockResolvedValue({
        status: 'SCHEDULED',
      });

      await expect(
        service.joinClassroom('session-uuid-101', studentUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Interactive Stage Promotion & Moderation', () => {
    it('TC-CLS-007: should record Hand-Raise state for student', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
      });
      mockAttendeeRepo.findOne.mockResolvedValue({
        classroomSessionId: 'classroom-uuid-301',
        userId: studentUser.id,
        isHandRaised: false,
      });

      await service.raiseHand('session-uuid-101', studentUser, true);

      expect(mockAttendeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isHandRaised: true,
        }),
      );
      expect(mockEventRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'HAND_RAISE_ON',
        }),
      );
    });

    it('TC-CLS-008: should promote student to stage dynamically with LiveKit permissions update', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
        hostUserId: tutorUser.id,
      });
      mockAttendeeRepo.findOne.mockResolvedValue({
        classroomSessionId: 'classroom-uuid-301',
        participantIdentity: studentUser.id,
        isStagePromoted: false,
        isHandRaised: true,
      });

      await service.promoteParticipant(
        'session-uuid-101',
        tutorUser,
        studentUser.id,
        true,
      );

      expect(mockMediaProvider.updateParticipantPermissions).toHaveBeenCalledWith(
        'ogroni-session-session-uuid-101',
        studentUser.id,
        { canPublish: true, canSubscribe: true, canPublishData: true },
      );
      expect(mockAttendeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isStagePromoted: true,
          isHandRaised: false, // reset hand raise
        }),
      );
    });

    it('TC-CLS-009: should reject stage promotion attempt by non-host user', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
        hostUserId: tutorUser.id,
      });

      await expect(
        service.promoteParticipant(
          'session-uuid-101',
          studentUser, // student tries to promote
          'another-student-id',
          true,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-CLS-010: should allow tutor to mute and kick disruptive participant', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
        hostUserId: tutorUser.id,
      });

      // Mute track
      await service.muteParticipant(
        'session-uuid-101',
        tutorUser,
        studentUser.id,
        'TR_AUDIO_1',
        true,
      );
      expect(mockMediaProvider.muteParticipantTrack).toHaveBeenCalledWith(
        'ogroni-session-session-uuid-101',
        studentUser.id,
        'TR_AUDIO_1',
        true,
      );

      // Kick participant
      mockAttendeeRepo.findOne.mockResolvedValue({
        participantIdentity: studentUser.id,
      });
      await service.kickParticipant(
        'session-uuid-101',
        tutorUser,
        studentUser.id,
        'Disruptive behavior',
      );
      expect(mockMediaProvider.removeParticipant).toHaveBeenCalledWith(
        'ogroni-session-session-uuid-101',
        studentUser.id,
      );
    });

    it('TC-CLS-011: should end classroom, delete LiveKit room and sync attendance to LMS', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
        hostUserId: tutorUser.id,
        status: 'LIVE',
      });
      mockAttendeeRepo.find.mockResolvedValue([
        {
          id: 'att-1',
          userId: studentUser.id,
          role: 'STUDENT',
          connectionStatus: 'CONNECTED',
          firstJoinedAt: new Date(Date.now() - 3600 * 1000), // 60 mins ago
          totalDurationSeconds: 3600,
        },
      ]);
      mockLmsAttendanceRepo.findOne.mockResolvedValue(null);

      await service.endClassroom('session-uuid-101', tutorUser, 'Great session');

      expect(mockMediaProvider.endRoom).toHaveBeenCalledWith('ogroni-session-session-uuid-101');
      expect(mockBookingSessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        }),
      );
      expect(mockLmsAttendanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-uuid-101',
          participantUserId: studentUser.id,
          attendanceStatus: 'present',
        }),
      );
    });
  });

  describe('LiveKit Webhooks & Idempotency', () => {
    it('TC-CLS-012: should process participant_left webhook and calculate duration', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
      });
      mockEventRepo.findOne.mockResolvedValue(null); // not duplicate
      mockAttendeeRepo.findOne.mockResolvedValue({
        id: 'att-1',
        firstJoinedAt: new Date(Date.now() - 1800 * 1000), // joined 30 mins ago
        totalDurationSeconds: 0,
        connectionStatus: 'CONNECTED',
      });

      (mockMediaProvider.verifyWebhook as any).mockResolvedValueOnce({
        event: 'participant_left',
        id: 'webhook-evt-999',
        room: { name: 'ogroni-session-session-uuid-101' },
        participant: { identity: studentUser.id },
      });

      const res = await service.handleWebhook('raw_payload', 'auth_sig');

      expect(res.success).toBe(true);
      expect(res.event).toBe('participant_left');
      expect(mockAttendeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionStatus: 'DISCONNECTED',
          totalDurationSeconds: expect.any(Number),
        }),
      );
    });

    it('TC-CLS-013: should ignore duplicate webhook event id idempotently', async () => {
      mockClassroomRepo.findOne.mockResolvedValue({
        id: 'classroom-uuid-301',
        roomName: 'ogroni-session-session-uuid-101',
      });
      mockEventRepo.findOne.mockResolvedValue({
        id: 'already-existing-event',
        livekitEventId: 'webhook-evt-dup',
      });

      (mockMediaProvider.verifyWebhook as any).mockResolvedValueOnce({
        event: 'participant_joined',
        id: 'webhook-evt-dup',
        room: { name: 'ogroni-session-session-uuid-101' },
      });

      const res = await service.handleWebhook('raw_payload', 'auth_sig');

      expect(res.success).toBe(true);
      expect(res.event).toBe('duplicate_ignored');
    });
  });
});
