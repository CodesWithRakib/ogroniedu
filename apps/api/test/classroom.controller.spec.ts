import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClassroomController } from '../src/modules/classroom/controllers/classroom.controller';
import { ClassroomService } from '../src/modules/classroom/services/classroom.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('ClassroomController Unit Tests', () => {
  let controller: ClassroomController;
  let mockService: any;

  const mockTutor: AuthenticatedUser = {
    id: '11111111-1111-4111-a111-111111111111',
    roles: ['tutor'],
    email: 'tutor@ogroniedu.com',
  };

  const mockStudent: AuthenticatedUser = {
    id: '22222222-2222-4222-b222-222222222222',
    roles: ['student'],
    email: 'student@ogroniedu.com',
  };

  const mockSessionId = '33333333-3333-4333-c333-333333333333';

  beforeEach(() => {
    mockService = {
      getOrCreateClassroomForSession: vi.fn().mockResolvedValue({
        classroom: {
          id: 'room-1',
          roomName: `ogroni-session-${mockSessionId}`,
          mode: 'SMALL_GROUP',
          status: 'SCHEDULED',
          maxParticipants: 6,
          title: 'Physics Class',
        },
        bookingSession: {
          id: mockSessionId,
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 3600000),
          status: 'scheduled',
        },
        userRole: 'HOST',
      }),
      joinClassroom: vi.fn().mockResolvedValue({
        token: 'test-token',
        serverUrl: 'wss://ogroniedu-57i4qo5d.livekit.cloud',
        roomName: `ogroni-session-${mockSessionId}`,
        mode: 'SMALL_GROUP',
        role: 'HOST',
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        participantIdentity: mockTutor.id,
        participantName: 'Farhan',
        sessionId: mockSessionId,
      }),
      raiseHand: vi.fn().mockResolvedValue(undefined),
      promoteParticipant: vi.fn().mockResolvedValue(undefined),
      muteParticipant: vi.fn().mockResolvedValue(undefined),
      kickParticipant: vi.fn().mockResolvedValue(undefined),
      endClassroom: vi.fn().mockResolvedValue(undefined),
      getAttendees: vi.fn().mockResolvedValue([]),
      handleWebhook: vi.fn().mockResolvedValue({ success: true, event: 'participant_joined' }),
    };

    controller = new ClassroomController(mockService as unknown as ClassroomService);
  });

  it('TC-CLS-CTRL-001: should return session metadata and role info', async () => {
    const res = await controller.getClassroomSession(mockTutor, mockSessionId);
    expect(res.success).toBe(true);
    expect(res.data.sessionId).toBe(mockSessionId);
    expect(res.data.isTutor).toBe(true);
    expect(res.data.mode).toBe('SMALL_GROUP');
  });

  it('TC-CLS-CTRL-002: should generate join token and payload', async () => {
    const res = await controller.joinClassroom(mockTutor, mockSessionId, {
      deviceInfo: { isMobile: false },
    });
    expect(res.success).toBe(true);
    expect(res.data.token).toBe('test-token');
    expect(mockService.joinClassroom).toHaveBeenCalledWith(mockSessionId, mockTutor, {
      isMobile: false,
    });
  });

  it('TC-CLS-CTRL-003: should toggle hand raise', async () => {
    const res = await controller.raiseHand(mockStudent, mockSessionId, { isHandRaised: true });
    expect(res.success).toBe(true);
    expect(res.data.isHandRaised).toBe(true);
    expect(mockService.raiseHand).toHaveBeenCalledWith(mockSessionId, mockStudent, true);
  });

  it('TC-CLS-CTRL-004: should promote participant to stage', async () => {
    const res = await controller.promoteParticipant(mockTutor, mockSessionId, {
      participantIdentity: mockStudent.id,
      canPublish: true,
    });
    expect(res.success).toBe(true);
    expect(res.data.canPublish).toBe(true);
    expect(mockService.promoteParticipant).toHaveBeenCalledWith(
      mockSessionId,
      mockTutor,
      mockStudent.id,
      true,
    );
  });

  it('TC-CLS-CTRL-005: should mute participant track', async () => {
    const res = await controller.muteParticipant(mockTutor, mockSessionId, {
      participantIdentity: mockStudent.id,
      trackSid: 'TR_1',
      muted: true,
    });
    expect(res.success).toBe(true);
    expect(mockService.muteParticipant).toHaveBeenCalledWith(
      mockSessionId,
      mockTutor,
      mockStudent.id,
      'TR_1',
      true,
    );
  });

  it('TC-CLS-CTRL-006: should kick participant from classroom', async () => {
    const res = await controller.kickParticipant(mockTutor, mockSessionId, {
      participantIdentity: mockStudent.id,
      reason: 'Disruptive',
    });
    expect(res.success).toBe(true);
    expect(mockService.kickParticipant).toHaveBeenCalledWith(
      mockSessionId,
      mockTutor,
      mockStudent.id,
      'Disruptive',
    );
  });

  it('TC-CLS-CTRL-007: should end classroom and finalize attendance', async () => {
    const res = await controller.endClassroom(mockTutor, mockSessionId, {
      notes: 'Lesson complete',
    });
    expect(res.success).toBe(true);
    expect(mockService.endClassroom).toHaveBeenCalledWith(
      mockSessionId,
      mockTutor,
      'Lesson complete',
    );
  });

  it('TC-CLS-CTRL-008: should process webhook request', async () => {
    const mockReq: any = { rawBody: Buffer.from('{"event":"participant_joined"}') };
    const res = await controller.handleWebhook(mockReq, 'valid-auth-header');
    expect(res.success).toBe(true);
    expect(mockService.handleWebhook).toHaveBeenCalled();
  });
});
