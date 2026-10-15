import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionAttendanceEntity } from '../entities/session-attendance.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { AuditService } from '../../audit/audit.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { NotificationService } from '../../notifications/notification.service';
import { LearningAccessService } from './learning-access.service';
import { MarkAttendanceDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';

/**
 * Session attendance: tutor/admin recording with participant validation,
 * student + guardian notifications, and scoped attendance reads.
 */
@Injectable()
export class LearningAttendanceService {
  private readonly logger = new Logger(LearningAttendanceService.name);

  constructor(
    @InjectRepository(SessionAttendanceEntity)
    private readonly attendanceRepo: Repository<SessionAttendanceEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(forwardRef(() => LearningAccessService))
    private readonly access: LearningAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  /**
   * Mark attendance for a session participant
   */
  async markAttendance(
    user: AuthenticatedUser,
    dto: MarkAttendanceDto,
    requestId?: string,
  ): Promise<SessionAttendanceEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: dto.sessionId },
      relations: { booking: { subject: true }, studentUser: true },
    });

    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    // Only session tutor or admin can record attendance
    const isTutor = session.tutorUserId === user.id;
    const isAdmin = isAdminRole(user);
    if (!isTutor && !isAdmin) {
      throw new ForbiddenException(
        'Only the assigned tutor or admin can record attendance for this session',
      );
    }

    // Validate participant matches session student
    if (session.studentUserId !== dto.participantUserId) {
      throw new BadRequestException('Participant user must match the session student');
    }

    let record = await this.attendanceRepo.findOne({
      where: {
        sessionId: dto.sessionId,
        participantUserId: dto.participantUserId,
      },
    });

    if (record) {
      record.attendanceStatus = dto.attendanceStatus;
      record.notes = dto.notes ?? null;
      record.recordedBy = user.id;
      record.recordedAt = new Date();
    } else {
      record = this.attendanceRepo.create({
        sessionId: dto.sessionId,
        participantUserId: dto.participantUserId,
        attendanceStatus: dto.attendanceStatus,
        recordedBy: user.id,
        notes: dto.notes ?? null,
      });
    }

    const saved = await this.attendanceRepo.save(record);

    // Audit log
    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.attendance_marked',
      resourceType: 'session_attendance',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        sessionId: dto.sessionId,
        participantUserId: dto.participantUserId,
        attendanceStatus: dto.attendanceStatus,
      },
    });

    // Notify Student
    if (this.notificationService) {
      const subjectName = session.booking?.subject?.nameEn || 'Session';
      const studentName = session.studentUser?.displayName || 'Student';

      await this.notificationService
        .dispatch({
          userId: dto.participantUserId,
          recipientRole: 'student',
          eventType: 'attendance.marked',
          payload: {
            sessionId: dto.sessionId,
            studentName,
            subjectName,
            status: dto.attendanceStatus,
          },
        })
        .catch((err) =>
          this.logger.warn(`Failed to dispatch student attendance notification: ${err}`),
        );

      // Notify Active Guardians
      const guardianIds = await this.guardianAccess.findActiveGuardianIds(dto.participantUserId);

      for (const guardianId of guardianIds) {
        await this.notificationService
          .dispatch({
            userId: guardianId,
            recipientRole: 'guardian',
            eventType: 'attendance.marked',
            payload: {
              sessionId: dto.sessionId,
              studentName,
              subjectName,
              status: dto.attendanceStatus,
            },
          })
          .catch((err) =>
            this.logger.warn(`Failed to dispatch guardian attendance notification: ${err}`),
          );
      }
    }

    return saved;
  }

  /**
   * Get attendance for a session
   */
  async getSessionAttendance(
    user: AuthenticatedUser,
    sessionId: string,
  ): Promise<SessionAttendanceEntity[]> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    await this.access.assertCanAccessStudentRecords(user, session.studentUserId, session.bookingId);

    return this.attendanceRepo.find({
      where: { sessionId },
      relations: { participantUser: true, recordedByUser: true },
    });
  }
}
