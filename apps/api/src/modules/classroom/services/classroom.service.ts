import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ClassroomSessionEntity } from '../entities/classroom-session.entity';
import { ClassroomAttendanceRecordEntity } from '../entities/classroom-attendance-record.entity';
import { ClassroomConnectionEventEntity } from '../entities/classroom-connection-event.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { SessionAttendanceEntity } from '../../learning/entities/session-attendance.entity';
import { UserEntity } from '../../auth/entities/user.entity';
import { MEDIA_PROVIDER, CLASSROOM_CONFIG } from '../constants/classroom.constants';
import type { IMediaProvider, LiveKitWebhookPayload } from '../interfaces/media-provider.interface';
import type {
  ClassroomMode,
  ClassroomRole,
  ClassroomJoinPayload,
  ClassroomAttendeeSummary,
} from '@ogroniedu/contracts';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class ClassroomService {
  private readonly logger = new Logger(ClassroomService.name);

  constructor(
    @InjectRepository(ClassroomSessionEntity)
    private readonly classroomRepo: Repository<ClassroomSessionEntity>,
    @InjectRepository(ClassroomAttendanceRecordEntity)
    private readonly attendeeRepo: Repository<ClassroomAttendanceRecordEntity>,
    @InjectRepository(ClassroomConnectionEventEntity)
    private readonly eventRepo: Repository<ClassroomConnectionEventEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly bookingSessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(SessionAttendanceEntity)
    private readonly lmsAttendanceRepo: Repository<SessionAttendanceEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @Inject(MEDIA_PROVIDER)
    private readonly mediaProvider: IMediaProvider,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /**
   * Resolve or initialize a classroom session for a booking session.
   */
  async getOrCreateClassroomForSession(
    sessionId: string,
    user: AuthenticatedUser,
  ): Promise<{
    classroom: ClassroomSessionEntity;
    bookingSession: BookingSessionEntity;
    userRole: ClassroomRole;
  }> {
    const bookingSession = await this.bookingSessionRepo.findOne({
      where: { id: sessionId },
      relations: {
        booking: {
          subject: true,
        },
        tutorProfile: true,
        studentUser: true,
      },
    });

    if (!bookingSession) {
      throw new NotFoundException(`Tutoring session ${sessionId} not found.`);
    }

    if (bookingSession.status === 'cancelled') {
      throw new BadRequestException('This tutoring session has been cancelled.');
    }

    // Role & ownership check
    const isHost = user.id === bookingSession.tutorUserId;
    const isStudent = user.id === bookingSession.studentUserId;
    const isAdmin = user.roles?.includes('admin') || user.roles?.includes('super_admin');
    const isGuardian = user.roles?.includes('guardian');

    if (!isHost && !isStudent && !isAdmin && !isGuardian) {
      throw new ForbiddenException('You are not authorized to access this classroom session.');
    }

    // Guardians cannot join as tutors
    if (isGuardian && isHost) {
      throw new ForbiddenException('Guardians cannot join a live classroom session as host.');
    }

    let userRole: ClassroomRole = 'OBSERVER';
    if (isHost || isAdmin) {
      userRole = 'HOST';
    } else if (isStudent) {
      userRole = 'STUDENT';
    }

    let classroom = await this.classroomRepo.findOne({
      where: { bookingSessionId: sessionId },
    });

    if (!classroom) {
      const roomName = `ogroni-session-${sessionId}`;
      const title =
        bookingSession.booking?.subject?.nameEn ||
        `Live Tutoring Session ${sessionId.slice(0, 8)}`;
      const mode: ClassroomMode = 'SMALL_GROUP';

      classroom = this.classroomRepo.create({
        roomName,
        title,
        mode,
        status: 'SCHEDULED',
        bookingSessionId: sessionId,
        bookingId: bookingSession.bookingId,
        hostUserId: bookingSession.tutorUserId,
        maxParticipants: CLASSROOM_CONFIG.MAX_SMALL_GROUP_PARTICIPANTS,
      });

      classroom = await this.classroomRepo.save(classroom);
      this.logger.log(`Created new classroom session ${classroom.id} for room ${roomName}`);
    }

    return { classroom, bookingSession, userRole };
  }

  /**
   * Generate an authorized LiveKit join token and initialize attendee record.
   */
  async joinClassroom(
    sessionId: string,
    user: AuthenticatedUser,
    deviceInfo?: Record<string, unknown>,
  ): Promise<ClassroomJoinPayload> {
    const { classroom, bookingSession, userRole } = await this.getOrCreateClassroomForSession(
      sessionId,
      user,
    );

    // Time window validation (15 mins early to 120 mins late for attendees; hosts/admins can enter early to prepare)
    const now = new Date();
    const startsAt = new Date(bookingSession.startsAt);
    const endsAt = new Date(bookingSession.endsAt);
    const earliestJoin = new Date(
      startsAt.getTime() - CLASSROOM_CONFIG.ALLOW_EARLY_JOIN_MINUTES * 60 * 1000,
    );
    const latestJoin = new Date(
      endsAt.getTime() + CLASSROOM_CONFIG.ALLOW_LATE_JOIN_MINUTES * 60 * 1000,
    );

    const isHostOrAdmin = userRole === 'HOST' || userRole === 'CO_HOST';

    if (!isHostOrAdmin && now < earliestJoin && classroom.status !== 'LIVE') {
      throw new BadRequestException(
        `Classroom is not open yet. Doors open at ${earliestJoin.toLocaleTimeString()}.`,
      );
    }

    if (!isHostOrAdmin && now > latestJoin && classroom.status !== 'LIVE') {
      throw new BadRequestException('This classroom session window has expired.');
    }

    if (classroom.status === 'ENDED' || bookingSession.status === 'completed') {
      throw new BadRequestException('This classroom session has already ended.');
    }

    // Fetch user details for display name
    const dbUser = await this.userRepo.findOne({ where: { id: user.id } });
    const participantName =
      dbUser?.displayName ||
      (userRole === 'HOST' ? 'Tutor' : userRole === 'STUDENT' ? 'Student' : 'Guest');

    // Find or create attendee record
    let attendee = await this.attendeeRepo.findOne({
      where: {
        classroomSessionId: classroom.id,
        userId: user.id,
      },
    });

    if (!attendee) {
      attendee = this.attendeeRepo.create({
        classroomSessionId: classroom.id,
        userId: user.id,
        participantIdentity: user.id,
        participantName,
        role: userRole,
        firstJoinedAt: now,
        connectionStatus: 'CONNECTED',
        reconnectionCount: 0,
        deviceInfo: deviceInfo || null,
      });
    } else {
      attendee.connectionStatus = 'CONNECTED';
      attendee.reconnectionCount += 1;
      if (!attendee.firstJoinedAt) {
        attendee.firstJoinedAt = now;
      }
      if (deviceInfo) {
        attendee.deviceInfo = deviceInfo;
      }
    }
    await this.attendeeRepo.save(attendee);

    // Determine permissions based on Classroom Mode & Role
    let canPublish = false;
    let canSubscribe = true;
    let canPublishData = true;

    if (userRole === 'HOST' || userRole === 'CO_HOST') {
      canPublish = true;
      canSubscribe = true;
      canPublishData = true;
    } else if (userRole === 'STUDENT') {
      if (classroom.mode === 'SMALL_GROUP') {
        // Mode A: Small group interactive class (1-6 participants)
        canPublish = true;
        canSubscribe = true;
        canPublishData = true;
      } else {
        // Mode B: Large batch webinar class (50-500+ participants)
        // Students are view-only unless promoted to stage
        canPublish = Boolean(attendee.isStagePromoted);
        canSubscribe = true;
        canPublishData = true;
      }
    } else {
      // Observer
      canPublish = false;
      canSubscribe = true;
      canPublishData = false;
    }

    // Transition session status to LIVE if scheduled
    if (classroom.status === 'SCHEDULED') {
      classroom.status = 'LIVE';
      classroom.startedAt = now;
      await this.classroomRepo.save(classroom);
    }

    if (bookingSession.status === 'scheduled') {
      bookingSession.status = 'in_progress';
      bookingSession.actualStartedAt = now;
      await this.bookingSessionRepo.save(bookingSession);
    }

    // Log connection event
    await this.eventRepo.save(
      this.eventRepo.create({
        classroomSessionId: classroom.id,
        userId: user.id,
        participantIdentity: user.id,
        eventType: 'JOINED',
        eventTimestamp: now,
        metadata: { role: userRole, canPublish, mode: classroom.mode },
      }),
    );

    // Generate LiveKit Access Token
    const token = await this.mediaProvider.generateAccessToken({
      roomName: classroom.roomName,
      participantIdentity: user.id,
      participantName,
      isHost: userRole === 'HOST',
      canPublish,
      canSubscribe,
      canPublishData,
      ttlSeconds: CLASSROOM_CONFIG.TOKEN_TTL_SECONDS,
      metadata: {
        userId: user.id,
        role: userRole,
        mode: classroom.mode,
      },
    });

    const livekitUrl =
      this.config.get<string>('LIVEKIT_URL') || 'wss://ogroniedu-57i4qo5d.livekit.cloud';

    return {
      token,
      serverUrl: livekitUrl,
      roomName: classroom.roomName,
      mode: classroom.mode,
      role: userRole,
      canPublish,
      canSubscribe,
      canPublishData,
      participantIdentity: user.id,
      participantName,
      sessionId,
      bookingId: bookingSession.bookingId,
      subjectTitle: classroom.title,
    };
  }

  /**
   * Interactive Stage Promotion: Raise Hand request from student.
   */
  async raiseHand(sessionId: string, user: AuthenticatedUser, isHandRaised: boolean): Promise<void> {
    const { classroom } = await this.getOrCreateClassroomForSession(sessionId, user);

    const attendee = await this.attendeeRepo.findOne({
      where: { classroomSessionId: classroom.id, userId: user.id },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee record not found.');
    }

    attendee.isHandRaised = isHandRaised;
    attendee.handRaisedAt = isHandRaised ? new Date() : null;
    await this.attendeeRepo.save(attendee);

    await this.eventRepo.save(
      this.eventRepo.create({
        classroomSessionId: classroom.id,
        userId: user.id,
        participantIdentity: user.id,
        eventType: isHandRaised ? 'HAND_RAISE_ON' : 'HAND_RAISE_OFF',
        eventTimestamp: new Date(),
      }),
    );
  }

  /**
   * Host Moderation: Promote or demote participant to/from stage (grant/revoke canPublish).
   */
  async promoteParticipant(
    sessionId: string,
    tutorUser: AuthenticatedUser,
    participantIdentity: string,
    canPublish: boolean,
  ): Promise<void> {
    const { classroom, userRole } = await this.getOrCreateClassroomForSession(
      sessionId,
      tutorUser,
    );

    if (userRole !== 'HOST') {
      throw new ForbiddenException('Only the session host can promote participants to stage.');
    }

    const attendee = await this.attendeeRepo.findOne({
      where: { classroomSessionId: classroom.id, participantIdentity },
    });

    if (!attendee) {
      throw new NotFoundException(`Participant ${participantIdentity} not found in this room.`);
    }

    // Update permissions dynamically on LiveKit SFU
    await this.mediaProvider.updateParticipantPermissions(classroom.roomName, participantIdentity, {
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    });

    attendee.isStagePromoted = canPublish;
    attendee.stagePromotedAt = canPublish ? new Date() : null;
    if (canPublish) {
      attendee.isHandRaised = false; // reset hand raise once promoted
    }
    await this.attendeeRepo.save(attendee);

    await this.eventRepo.save(
      this.eventRepo.create({
        classroomSessionId: classroom.id,
        userId: attendee.userId,
        participantIdentity,
        eventType: canPublish ? 'STAGE_PROMOTED' : 'STAGE_DEMOTED',
        eventTimestamp: new Date(),
      }),
    );
  }

  /**
   * Host Moderation: Mute participant track or disable publishing.
   */
  async muteParticipant(
    sessionId: string,
    tutorUser: AuthenticatedUser,
    participantIdentity: string,
    trackSid?: string,
    muted: boolean = true,
  ): Promise<void> {
    const { classroom, userRole } = await this.getOrCreateClassroomForSession(
      sessionId,
      tutorUser,
    );

    if (userRole !== 'HOST') {
      throw new ForbiddenException('Only the session host can mute participants.');
    }

    if (trackSid) {
      await this.mediaProvider.muteParticipantTrack(
        classroom.roomName,
        participantIdentity,
        trackSid,
        muted,
      );
    } else {
      // Revoke publishing permission if muting whole participant
      await this.mediaProvider.updateParticipantPermissions(
        classroom.roomName,
        participantIdentity,
        { canPublish: false },
      );
    }

    await this.eventRepo.save(
      this.eventRepo.create({
        classroomSessionId: classroom.id,
        participantIdentity,
        eventType: 'MUTED',
        eventTimestamp: new Date(),
        metadata: { trackSid, muted },
      }),
    );
  }

  /**
   * Host Moderation: Remove disruptive user from classroom.
   */
  async kickParticipant(
    sessionId: string,
    tutorUser: AuthenticatedUser,
    participantIdentity: string,
    reason?: string,
  ): Promise<void> {
    const { classroom, userRole } = await this.getOrCreateClassroomForSession(
      sessionId,
      tutorUser,
    );

    if (userRole !== 'HOST') {
      throw new ForbiddenException('Only the session host can remove participants.');
    }

    await this.mediaProvider.removeParticipant(classroom.roomName, participantIdentity);

    const attendee = await this.attendeeRepo.findOne({
      where: { classroomSessionId: classroom.id, participantIdentity },
    });

    if (attendee) {
      attendee.connectionStatus = 'DISCONNECTED';
      attendee.lastLeftAt = new Date();
      await this.attendeeRepo.save(attendee);
    }

    await this.eventRepo.save(
      this.eventRepo.create({
        classroomSessionId: classroom.id,
        participantIdentity,
        eventType: 'KICKED',
        eventTimestamp: new Date(),
        metadata: { reason },
      }),
    );
  }

  /**
   * Host Moderation: End classroom session for everyone and finalize attendance.
   */
  async endClassroom(
    sessionId: string,
    tutorUser: AuthenticatedUser,
    notes?: string,
  ): Promise<void> {
    const { classroom, bookingSession, userRole } = await this.getOrCreateClassroomForSession(
      sessionId,
      tutorUser,
    );

    if (userRole !== 'HOST') {
      throw new ForbiddenException('Only the session host can end the classroom session.');
    }

    const now = new Date();

    // End room in LiveKit SFU
    await this.mediaProvider.endRoom(classroom.roomName);

    classroom.status = 'ENDED';
    classroom.endedAt = now;
    await this.classroomRepo.save(classroom);

    // Update booking session status
    bookingSession.status = 'completed';
    bookingSession.completedAt = now;
    await this.bookingSessionRepo.save(bookingSession);

    // Sync cumulative attendance to LMS session_attendance
    const attendees = await this.attendeeRepo.find({
      where: { classroomSessionId: classroom.id },
    });

    for (const att of attendees) {
      if (att.connectionStatus === 'CONNECTED') {
        att.connectionStatus = 'DISCONNECTED';
        att.lastLeftAt = now;
        if (att.firstJoinedAt) {
          const sessionDuration = Math.floor(
            (now.getTime() - new Date(att.firstJoinedAt).getTime()) / 1000,
          );
          att.totalDurationSeconds = Math.max(att.totalDurationSeconds, sessionDuration);
        }
        await this.attendeeRepo.save(att);
      }

      // Upsert into legacy session_attendance for backward LMS compatibility
      if (att.role === 'STUDENT') {
        let lmsRecord = await this.lmsAttendanceRepo.findOne({
          where: { sessionId, participantUserId: att.userId },
        });

        if (!lmsRecord) {
          lmsRecord = this.lmsAttendanceRepo.create({
            sessionId,
            participantUserId: att.userId,
            attendanceStatus: att.totalDurationSeconds >= 600 ? 'present' : 'late',
            recordedBy: tutorUser.id,
            notes: notes || `Attended via LiveKit classroom: ${Math.round(att.totalDurationSeconds / 60)} mins`,
          });
        } else {
          lmsRecord.attendanceStatus = att.totalDurationSeconds >= 600 ? 'present' : 'late';
        }
        await this.lmsAttendanceRepo.save(lmsRecord);
      }
    }

    this.logger.log(`Classroom session ${sessionId} successfully ended by host ${tutorUser.id}`);
  }

  /**
   * List attendees and real-time hand-raise state.
   */
  async getAttendees(
    sessionId: string,
    user: AuthenticatedUser,
  ): Promise<ClassroomAttendeeSummary[]> {
    const { classroom } = await this.getOrCreateClassroomForSession(sessionId, user);

    const attendees = await this.attendeeRepo.find({
      where: { classroomSessionId: classroom.id },
      order: { isHandRaised: 'DESC', createdAt: 'ASC' },
    });

    return attendees.map((a) => ({
      id: a.id,
      userId: a.userId,
      participantIdentity: a.participantIdentity,
      participantName: a.participantName,
      role: a.role,
      firstJoinedAt: a.firstJoinedAt ? a.firstJoinedAt.toISOString() : null,
      lastLeftAt: a.lastLeftAt ? a.lastLeftAt.toISOString() : null,
      totalDurationSeconds: a.totalDurationSeconds,
      connectionStatus: a.connectionStatus,
      reconnectionCount: a.reconnectionCount,
      isHandRaised: a.isHandRaised,
      handRaisedAt: a.handRaisedAt ? a.handRaisedAt.toISOString() : null,
      isStagePromoted: a.isStagePromoted,
      stagePromotedAt: a.stagePromotedAt ? a.stagePromotedAt.toISOString() : null,
    }));
  }

  /**
   * Authoritative LiveKit Webhook Receiver for idempotency & automated attendance duration tracking.
   */
  async handleWebhook(rawBody: string | Buffer, authHeader: string): Promise<{ success: boolean; event: string }> {
    const payload: LiveKitWebhookPayload = await this.mediaProvider.verifyWebhook(
      rawBody,
      authHeader,
    );

    const eventId = payload.id;
    const eventType = payload.event;
    const roomName = payload.room?.name;
    const participantIdentity = payload.participant?.identity;

    if (!roomName) {
      return { success: true, event: 'ignored_missing_room' };
    }

    const classroom = await this.classroomRepo.findOne({
      where: { roomName },
    });

    if (!classroom) {
      this.logger.warn(`Webhook received for unknown classroom room: ${roomName}`);
      return { success: true, event: 'unknown_room' };
    }

    // Deduplication check
    if (eventId) {
      const existing = await this.eventRepo.findOne({
        where: { livekitEventId: eventId },
      });
      if (existing) {
        this.logger.log(`Duplicate LiveKit webhook ${eventId} ignored.`);
        return { success: true, event: 'duplicate_ignored' };
      }
    }

    const now = new Date();

    if (eventType === 'participant_joined' && participantIdentity) {
      let attendee = await this.attendeeRepo.findOne({
        where: { classroomSessionId: classroom.id, participantIdentity },
      });

      if (attendee) {
        attendee.connectionStatus = 'CONNECTED';
        if (!attendee.firstJoinedAt) {
          attendee.firstJoinedAt = now;
        }
        await this.attendeeRepo.save(attendee);
      }

      await this.eventRepo.save(
        this.eventRepo.create({
          classroomSessionId: classroom.id,
          participantIdentity,
          eventType: 'LIVEKIT_PARTICIPANT_JOINED',
          eventTimestamp: now,
          livekitEventId: eventId || null,
          metadata: payload as unknown as Record<string, unknown>,
        }),
      );
    } else if (eventType === 'participant_left' && participantIdentity) {
      const attendee = await this.attendeeRepo.findOne({
        where: { classroomSessionId: classroom.id, participantIdentity },
      });

      if (attendee) {
        attendee.connectionStatus = 'DISCONNECTED';
        attendee.lastLeftAt = now;
        if (attendee.firstJoinedAt) {
          const deltaSeconds = Math.max(
            0,
            Math.floor((now.getTime() - new Date(attendee.firstJoinedAt).getTime()) / 1000),
          );
          attendee.totalDurationSeconds = Math.max(attendee.totalDurationSeconds, deltaSeconds);
        }
        await this.attendeeRepo.save(attendee);
      }

      await this.eventRepo.save(
        this.eventRepo.create({
          classroomSessionId: classroom.id,
          participantIdentity,
          eventType: 'LIVEKIT_PARTICIPANT_LEFT',
          eventTimestamp: now,
          livekitEventId: eventId || null,
          metadata: payload as unknown as Record<string, unknown>,
        }),
      );
    } else if (eventType === 'room_finished') {
      classroom.status = 'ENDED';
      classroom.endedAt = now;
      await this.classroomRepo.save(classroom);

      await this.eventRepo.save(
        this.eventRepo.create({
          classroomSessionId: classroom.id,
          participantIdentity: 'SYSTEM',
          eventType: 'LIVEKIT_ROOM_FINISHED',
          eventTimestamp: now,
          livekitEventId: eventId || null,
          metadata: payload as unknown as Record<string, unknown>,
        }),
      );
    }

    return { success: true, event: eventType };
  }
}
