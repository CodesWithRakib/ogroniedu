import type { LearningGoalView } from '../interfaces/learning-goals.interfaces';
import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LearningGoalEntity, type LearningGoalStatus } from '../entities/learning-goal.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { LearningAccessService } from './learning-access.service';
import { CreateLearningGoalDto, UpdateLearningGoalDto, StudentScopedListQueryDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { toPageSize } from '../../../common/pagination';
import { assertGoalTransition, isTerminalGoal } from '../utils/learning-goal-transitions';

export type { LearningGoalView } from '../interfaces/learning-goals.interfaces';

const EVIDENCE_REQUIRED_STATUSES: readonly LearningGoalStatus[] = ['achieved', 'not_achieved'];

@Injectable()
export class LearningGoalsService {
  private readonly logger = new Logger(LearningGoalsService.name);

  constructor(
    @InjectRepository(LearningGoalEntity)
    private readonly goalRepo: Repository<LearningGoalEntity>,
    @Inject(forwardRef(() => LearningAccessService))
    private readonly access: LearningAccessService,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  async createGoal(
    user: AuthenticatedUser,
    dto: CreateLearningGoalDto,
    requestId?: string,
  ): Promise<LearningGoalView> {
    const booking = await this.access.loadBookingOrFail(dto.bookingId);
    this.access.assertCanAuthorLearning(user, booking);

    const goal = await this.goalRepo.save(
      this.goalRepo.create({
        bookingId: booking.id,
        studentUserId: booking.studentUserId,
        tutorUserId: booking.tutorUserId,
        title: dto.title.trim(),
        description: dto.description ?? null,
        targetDate: dto.targetDate ?? null,
        status: 'open',
        evidence: null,
        createdByUserId: user.id,
        achievedAt: null,
      }),
    );

    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.goal_created',
      resourceType: 'learning_goals',
      resourceId: goal.id,
      requestId,
      safeMetadata: { bookingId: booking.id, studentUserId: booking.studentUserId },
    });

    return this.toView(goal);
  }

  async updateGoal(
    user: AuthenticatedUser,
    goalId: string,
    dto: UpdateLearningGoalDto,
    requestId?: string,
  ): Promise<LearningGoalView> {
    const goal = await this.getGoalOrFail(goalId);
    const booking = await this.access.loadBookingOrFail(goal.bookingId);
    this.access.assertCanAuthorLearning(user, booking);

    if (isTerminalGoal(goal.status) && dto.status !== undefined && dto.status !== goal.status) {
      throw new BadRequestException('Completed or cancelled goals cannot be reopened');
    }

    if (dto.title !== undefined) goal.title = dto.title.trim();
    if (dto.description !== undefined) goal.description = dto.description;
    if (dto.targetDate !== undefined) goal.targetDate = dto.targetDate;

    if (dto.status !== undefined && dto.status !== goal.status) {
      assertGoalTransition(goal.status, dto.status);
      goal.status = dto.status;
    }
    if (dto.evidence !== undefined) goal.evidence = dto.evidence;

    if (EVIDENCE_REQUIRED_STATUSES.includes(goal.status) && !goal.evidence?.trim()) {
      throw new BadRequestException(
        'Evidence is required when a learning goal is marked achieved or not achieved',
      );
    }
    goal.achievedAt = goal.status === 'achieved' ? (goal.achievedAt ?? new Date()) : null;

    const saved = await this.goalRepo.save(goal);
    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.goal_updated',
      resourceType: 'learning_goals',
      resourceId: saved.id,
      requestId,
      safeMetadata: {
        bookingId: saved.bookingId,
        status: saved.status,
        evidenceProvided: Boolean(saved.evidence),
      },
    });

    if (dto.status !== undefined) {
      await this.notifyStatusChange(saved, booking.studentUserId);
    }

    return this.toView(saved);
  }

  async listGoals(user: AuthenticatedUser, query: StudentScopedListQueryDto) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = toPageSize(query.pageSize);

    const qb = this.goalRepo
      .createQueryBuilder('goal')
      .orderBy('goal.createdAt', 'DESC')
      .addOrderBy('goal.id', 'DESC');

    if (query.bookingId) {
      const booking = await this.access.loadBookingOrFail(query.bookingId);
      await this.access.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);
      qb.andWhere('goal.bookingId = :bookingId', { bookingId: query.bookingId });
    } else if (query.studentId) {
      await this.access.assertCanAccessStudentRecords(user, query.studentId);
      qb.andWhere('goal.studentUserId = :studentId', { studentId: query.studentId });
    } else if (isAdminRole(user)) {
      // Platform-wide read.
    } else if (user.roles?.includes('tutor')) {
      qb.andWhere('goal.tutorUserId = :userId', { userId: user.id });
    } else if (user.roles?.includes('guardian')) {
      const childIds = await this.guardianAccess.findActiveStudentIds(user.id);
      if (childIds.length === 0) return { items: [], totalItems: 0, page, pageSize };
      qb.andWhere('goal.studentUserId IN (:...childIds)', { childIds });
    } else {
      qb.andWhere('goal.studentUserId = :userId', { userId: user.id });
    }

    if (query.status) qb.andWhere('goal.status = :status', { status: query.status });
    if (query.from) qb.andWhere('goal.createdAt >= :from', { from: new Date(query.from) });
    if (query.to) qb.andWhere('goal.createdAt <= :to', { to: new Date(query.to) });

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { items: rows.map((row) => this.toView(row)), totalItems: total, page, pageSize };
  }

  async listGoalsForStudent(studentUserId: string): Promise<LearningGoalView[]> {
    const rows = await this.goalRepo.find({
      where: { studentUserId, status: In(['open', 'in_progress', 'achieved']) },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    return rows.map((row) => this.toView(row));
  }

  private async getGoalOrFail(goalId: string): Promise<LearningGoalEntity> {
    const goal = await this.goalRepo.findOne({ where: { id: goalId } });
    if (!goal) throw new NotFoundException(`Learning goal ${goalId} not found`);
    return goal;
  }

  private async notifyStatusChange(goal: LearningGoalEntity, studentUserId: string): Promise<void> {
    if (!this.notificationService) return;
    const payload = {
      goalId: goal.id,
      goalTitle: goal.title,
      status: goal.status,
    };
    await this.notificationService
      .dispatch({
        userId: studentUserId,
        recipientRole: 'student',
        eventType: 'learning_goal.updated',
        payload,
      })
      .catch((err) => this.logger.warn(`Goal notification failed: ${String(err)}`));

    const guardianIds = await this.guardianAccess.findActiveGuardianIds(studentUserId);
    for (const guardianId of guardianIds) {
      await this.notificationService
        .dispatch({
          userId: guardianId,
          recipientRole: 'guardian',
          eventType: 'learning_goal.updated',
          payload,
        })
        .catch((err) => this.logger.warn(`Goal guardian notification failed: ${String(err)}`));
    }
  }

  private toView(goal: LearningGoalEntity): LearningGoalView {
    return {
      id: goal.id,
      bookingId: goal.bookingId,
      studentUserId: goal.studentUserId,
      tutorUserId: goal.tutorUserId,
      title: goal.title,
      description: goal.description,
      targetDate: goal.targetDate,
      status: goal.status,
      evidence: goal.evidence,
      achievedAt: goal.achievedAt ? new Date(goal.achievedAt).toISOString() : null,
      createdAt: new Date(goal.createdAt).toISOString(),
      updatedAt: new Date(goal.updatedAt).toISOString(),
    };
  }
}
