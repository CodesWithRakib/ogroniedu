import type { LessonPlanView } from '../interfaces/lesson-plans.interfaces';
import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LessonPlanEntity } from '../entities/lesson-plan.entity';
import { LearningMaterialEntity } from '../entities/learning-material.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { AuditService } from '../../audit/audit.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { LearningAccessService } from './learning-access.service';
import { CreateLessonPlanDto, UpdateLessonPlanDto, LearningListQueryDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { toPageSize } from '../../../common/pagination';

export type { LessonPlanView } from '../interfaces/lesson-plans.interfaces';

@Injectable()
export class LessonPlansService {
  constructor(
    @InjectRepository(LessonPlanEntity)
    private readonly planRepo: Repository<LessonPlanEntity>,
    @InjectRepository(LearningMaterialEntity)
    private readonly materialRepo: Repository<LearningMaterialEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @Inject(forwardRef(() => LearningAccessService))
    private readonly access: LearningAccessService,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  async createLessonPlan(
    user: AuthenticatedUser,
    dto: CreateLessonPlanDto,
    requestId?: string,
  ): Promise<LessonPlanView> {
    const booking = await this.access.loadBookingOrFail(dto.bookingId);
    this.access.assertCanAuthorLearning(user, booking);

    if (dto.subjectId && dto.subjectId !== booking.subjectId) {
      throw new BadRequestException('subjectId must match the booking subject');
    }
    await this.assertSessionBelongsToBooking(dto.bookingId, dto.sessionId ?? null);

    const now = new Date();
    const publish = Boolean(dto.publishNow);
    const plan = this.planRepo.create({
      bookingId: booking.id,
      sessionId: dto.sessionId ?? null,
      tutorUserId: booking.tutorUserId,
      subjectId: dto.subjectId ?? null,
      title: dto.title.trim(),
      description: dto.description ?? null,
      objectives: dto.objectives ?? [],
      steps: dto.steps ?? [],
      status: publish ? 'published' : 'draft',
      publishedAt: publish ? now : null,
    });
    const saved = await this.planRepo.save(plan);

    await this.auditService.record({
      actorUserId: user.id,
      action: publish ? 'learning.lesson_plan_published' : 'learning.lesson_plan_created',
      resourceType: 'lesson_plans',
      resourceId: saved.id,
      requestId,
      safeMetadata: { bookingId: booking.id, sessionId: dto.sessionId ?? null },
    });

    return this.toView(saved, [], true);
  }

  async updateLessonPlan(
    user: AuthenticatedUser,
    planId: string,
    dto: UpdateLessonPlanDto,
    requestId?: string,
  ): Promise<LessonPlanView> {
    const plan = await this.getPlanEntity(planId);
    const booking = await this.access.loadBookingOrFail(plan.bookingId);
    this.access.assertCanAuthorLearning(user, booking);
    if (plan.status === 'archived') {
      throw new BadRequestException('Archived lesson plans cannot be edited');
    }

    if (dto.sessionId !== undefined) {
      await this.assertSessionBelongsToBooking(plan.bookingId, dto.sessionId);
      plan.sessionId = dto.sessionId;
    }
    if (dto.subjectId !== undefined) {
      if (dto.subjectId && dto.subjectId !== booking.subjectId) {
        throw new BadRequestException('subjectId must match the booking subject');
      }
      plan.subjectId = dto.subjectId;
    }
    if (dto.title !== undefined) plan.title = dto.title.trim();
    if (dto.description !== undefined) plan.description = dto.description;
    if (dto.objectives !== undefined) plan.objectives = dto.objectives;
    if (dto.steps !== undefined) plan.steps = dto.steps;

    const saved = await this.planRepo.save(plan);
    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.lesson_plan_updated',
      resourceType: 'lesson_plans',
      resourceId: saved.id,
      requestId,
      safeMetadata: { bookingId: saved.bookingId },
    });
    return this.hydrateView(saved, true);
  }

  async publishLessonPlan(
    user: AuthenticatedUser,
    planId: string,
    requestId?: string,
  ): Promise<LessonPlanView> {
    const plan = await this.getPlanEntity(planId);
    const booking = await this.access.loadBookingOrFail(plan.bookingId);
    this.access.assertCanAuthorLearning(user, booking);

    if (plan.status === 'archived') {
      throw new BadRequestException('Archived lesson plans cannot be published');
    }
    if (plan.status !== 'published') {
      plan.status = 'published';
      plan.publishedAt = plan.publishedAt ?? new Date();
      await this.planRepo.save(plan);
      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.lesson_plan_published',
        resourceType: 'lesson_plans',
        resourceId: plan.id,
        requestId,
        safeMetadata: { bookingId: plan.bookingId },
      });
    }
    return this.hydrateView(plan, true);
  }

  async archiveLessonPlan(
    user: AuthenticatedUser,
    planId: string,
    requestId?: string,
  ): Promise<LessonPlanView> {
    const plan = await this.getPlanEntity(planId);
    const booking = await this.access.loadBookingOrFail(plan.bookingId);
    this.access.assertCanAuthorLearning(user, booking);

    if (plan.status !== 'archived') {
      plan.status = 'archived';
      await this.planRepo.save(plan);
      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.lesson_plan_archived',
        resourceType: 'lesson_plans',
        resourceId: plan.id,
        requestId,
        safeMetadata: { bookingId: plan.bookingId },
      });
    }
    return this.hydrateView(plan, true);
  }

  async getLessonPlan(user: AuthenticatedUser, planId: string): Promise<LessonPlanView> {
    const plan = await this.getPlanEntity(planId);
    const canSeeDrafts = isAdminRole(user) || plan.tutorUserId === user.id;
    if (!canSeeDrafts && plan.status !== 'published') {
      throw new NotFoundException(`Lesson plan ${planId} not found`);
    }
    if (!canSeeDrafts) {
      const booking = await this.access.loadBookingOrFail(plan.bookingId);
      await this.access.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);
    }
    return this.hydrateView(plan, canSeeDrafts);
  }

  async listLessonPlans(user: AuthenticatedUser, query: LearningListQueryDto) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = toPageSize(query.pageSize);
    const childIds = await this.guardianAccess.findActiveStudentIds(user.id);

    const qb = this.planRepo
      .createQueryBuilder('plan')
      .innerJoin('plan.booking', 'booking')
      .orderBy('plan.createdAt', 'DESC')
      .addOrderBy('plan.id', 'DESC');

    if (query.bookingId) {
      qb.andWhere('plan.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    if (query.sessionId) {
      qb.andWhere('plan.sessionId = :sessionId', { sessionId: query.sessionId });
    }
    if (query.status) {
      qb.andWhere('plan.status = :status', { status: query.status });
    }

    if (isAdminRole(user)) {
      // Platform oversight: no additional scope.
    } else if (query.bookingId) {
      const booking = await this.access.loadBookingOrFail(query.bookingId);
      if (booking.tutorUserId !== user.id) {
        await this.access.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);
        qb.andWhere("plan.status = 'published'");
      }
    } else {
      // Without a booking filter, only show content the caller may read:
      // their own authored plans, or published plans of their bookings.
      const allowedStudentIds = [user.id, ...childIds];
      qb.andWhere(
        "(plan.tutorUserId = :userId OR (plan.status = 'published' AND booking.studentUserId IN (:...allowedStudentIds)))",
        { userId: user.id, allowedStudentIds },
      );
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    const plans = await this.attachMaterials(rows);
    const views = plans.map(({ plan, materials }) =>
      this.toView(plan, materials, isAdminRole(user) || plan.tutorUserId === user.id),
    );

    return { items: views, totalItems: total, page, pageSize };
  }

  /** Published lesson plan pinned to a session, for the session detail page. */
  async getSessionLessonPlan(
    user: AuthenticatedUser,
    sessionId: string,
  ): Promise<LessonPlanView | null> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    const booking = await this.access.loadBookingOrFail(session.bookingId);
    const canSeeDrafts = this.access.isLearningOwner(user, booking);
    if (!canSeeDrafts) {
      await this.access.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);
    }

    const plan = await this.planRepo.findOne({
      where: { sessionId, ...(canSeeDrafts ? {} : { status: 'published' as const }) },
      order: { createdAt: 'DESC' },
    });
    if (!plan) return null;
    return this.hydrateView(plan, canSeeDrafts);
  }

  private async getPlanEntity(planId: string): Promise<LessonPlanEntity> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Lesson plan ${planId} not found`);
    }
    return plan;
  }

  private async assertSessionBelongsToBooking(
    bookingId: string,
    sessionId: string | null,
  ): Promise<void> {
    if (!sessionId) return;
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session || session.bookingId !== bookingId) {
      throw new BadRequestException('Provided sessionId does not belong to this booking');
    }
  }

  private async hydrateView(
    plan: LessonPlanEntity,
    includeDrafts: boolean,
  ): Promise<LessonPlanView> {
    const materials = await this.materialRepo.find({
      where: { lessonPlanId: plan.id },
      relations: { fileAsset: true },
      order: { createdAt: 'ASC' },
    });
    return this.toView(plan, materials, includeDrafts);
  }

  private async attachMaterials(
    plans: LessonPlanEntity[],
  ): Promise<Array<{ plan: LessonPlanEntity; materials: LearningMaterialEntity[] }>> {
    if (plans.length === 0) return [];
    const materials = await this.materialRepo.find({
      where: { lessonPlanId: In(plans.map((p) => p.id)) },
      relations: { fileAsset: true },
      order: { createdAt: 'ASC' },
    });
    return plans.map((plan) => ({
      plan,
      materials: materials.filter((m) => m.lessonPlanId === plan.id),
    }));
  }

  private toView(
    plan: LessonPlanEntity,
    materials: LearningMaterialEntity[],
    includeDrafts: boolean,
  ): LessonPlanView {
    const visible = materials.filter(
      (material) => includeDrafts || material.status === 'published',
    );
    return {
      id: plan.id,
      bookingId: plan.bookingId,
      sessionId: plan.sessionId,
      tutorUserId: plan.tutorUserId,
      subjectId: plan.subjectId,
      title: plan.title,
      description: plan.description,
      objectives: plan.objectives ?? [],
      steps: plan.steps ?? [],
      status: plan.status,
      publishedAt: plan.publishedAt ? new Date(plan.publishedAt).toISOString() : null,
      createdAt: new Date(plan.createdAt).toISOString(),
      updatedAt: new Date(plan.updatedAt).toISOString(),
      materials: visible.map((material) => ({
        id: material.id,
        kind: material.kind,
        title: material.title,
        description: material.description,
        status: material.status,
        externalUrl: material.externalUrl,
        fileName: material.fileAsset?.originalFilename ?? null,
        mediaType: material.fileAsset?.mediaType ?? null,
        sizeBytes:
          material.fileAsset?.sizeBytes !== undefined && material.fileAsset?.sizeBytes !== null
            ? String(material.fileAsset.sizeBytes)
            : null,
        publishedAt: material.publishedAt ? new Date(material.publishedAt).toISOString() : null,
      })),
    };
  }
}
