import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetaFeedbackEntity } from './entities/beta-feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { TriageFeedbackDto } from './dto/triage-feedback.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { AuditService } from '../audit/audit.service';
import { RateLimiterService } from '../auth/rate-limiter.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(BetaFeedbackEntity)
    private readonly feedbackRepo: Repository<BetaFeedbackEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  /**
   * Submit new beta feedback record.
   * Rate limited to 10 submissions per hour per user/IP.
   */
  async submitFeedback(
    dto: CreateFeedbackDto,
    user?: AuthenticatedUser | null,
    clientIp?: string,
  ): Promise<BetaFeedbackEntity> {
    const rateLimitKey = user?.id ? `feedback:user:${user.id}` : `feedback:ip:${clientIp || 'unknown'}`;
    this.rateLimiter.checkLimit(rateLimitKey, 10, 3600000); // 10 per hour

    const primaryRole = user?.roles?.[0] || 'anonymous';

    const feedback = this.feedbackRepo.create({
      reporterUserId: user?.id || null,
      reporterRole: primaryRole,
      category: dto.category,
      title: dto.title.trim(),
      description: dto.description.trim(),
      route: dto.route || null,
      reproductionSteps: dto.reproductionSteps || null,
      diagnosticMetadata: dto.diagnosticMetadata || null,
      status: 'submitted',
      severity: null,
      assignedToUserId: null,
      triageNotes: null,
    });

    const saved = await this.feedbackRepo.save(feedback);
    this.logger.log(`New beta feedback submitted [${saved.id}]: category=${saved.category}, role=${saved.reporterRole}`);

    await this.auditService.record({
      actorUserId: user?.id || null,
      action: 'feedback.submitted',
      resourceType: 'beta_feedback',
      resourceId: saved.id,
      safeMetadata: {
        category: saved.category,
        role: saved.reporterRole,
        route: saved.route,
      },
    });

    return saved;
  }

  /**
   * Retrieve feedback submitted by the authenticated user.
   * Internal triage notes are redacted for privacy.
   */
  async getMyFeedback(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: Partial<BetaFeedbackEntity>[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.feedbackRepo.findAndCount({
      where: { reporterUserId: userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const sanitized = items.map((item) => {
      const { triageNotes: _notes, ...rest } = item;
      return rest;
    });

    return { items: sanitized, total, page, limit };
  }

  /**
   * Retrieve specific feedback item by ID with ownership enforcement.
   */
  async getFeedbackById(id: string, user: AuthenticatedUser): Promise<BetaFeedbackEntity> {
    const item = await this.feedbackRepo.findOne({
      where: { id },
      relations: ['reporter', 'assignee'],
    });

    if (!item) {
      throw new NotFoundException(`Beta feedback item #${id} not found`);
    }

    const isStaff = user.roles.some((r) => ['admin', 'super_admin', 'support_agent'].includes(r));
    if (!isStaff && item.reporterUserId !== user.id) {
      throw new ForbiddenException('You do not have permission to view this feedback item');
    }

    if (!isStaff) {
      item.triageNotes = null;
    }

    return item;
  }

  /**
   * Administrative query of all feedback with category, severity, and status filters.
   */
  async queryAdminFeedback(
    query: QueryFeedbackDto,
  ): Promise<{ items: BetaFeedbackEntity[]; total: number; page: number; limit: number; totalPages: number }> {
    const qb = this.feedbackRepo.createQueryBuilder('fb');

    if (query.category) {
      qb.andWhere('fb.category = :category', { category: query.category });
    }
    if (query.severity) {
      qb.andWhere('fb.severity = :severity', { severity: query.severity });
    }
    if (query.status) {
      qb.andWhere('fb.status = :status', { status: query.status });
    }

    qb.orderBy('fb.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / query.limit) || 1;

    return { items, total, page: query.page, limit: query.limit, totalPages };
  }

  /**
   * Triage a feedback record (assign severity, update status, add triage notes).
   */
  async triageFeedback(
    id: string,
    dto: TriageFeedbackDto,
    actor: AuthenticatedUser,
  ): Promise<BetaFeedbackEntity> {
    const item = await this.feedbackRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Beta feedback item #${id} not found`);
    }

    if (dto.severity !== undefined) {
      item.severity = dto.severity;
    }
    if (dto.status !== undefined) {
      item.status = dto.status;
    }
    if (dto.assignedToUserId !== undefined) {
      item.assignedToUserId = dto.assignedToUserId;
    }
    if (dto.triageNotes !== undefined) {
      item.triageNotes = dto.triageNotes;
    }

    const updated = await this.feedbackRepo.save(item);
    this.logger.log(`Beta feedback [${id}] triaged by ${actor.id}: status=${updated.status}, severity=${updated.severity}`);

    await this.auditService.record({
      actorUserId: actor.id,
      action: 'feedback.triaged',
      resourceType: 'beta_feedback',
      resourceId: updated.id,
      reason: dto.triageNotes || undefined,
      safeMetadata: {
        status: updated.status,
        severity: updated.severity,
        assignedToUserId: updated.assignedToUserId,
      },
    });

    return updated;
  }
}
