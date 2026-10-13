import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { SupportTicketEntity } from './entities/support-ticket.entity';
import {
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_TERMINAL_STATUSES,
} from './enums/support-ticket-status.enum';
import {
  CreateSupportTicketDto,
  normalizeTicketPhone,
} from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { QuerySupportTicketsDto } from './dto/query-support-tickets.dto';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

/** Anti-spam: max tickets per email address per rolling 24h window. */
export const SUPPORT_TICKET_DAILY_CAP_PER_EMAIL = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Public contact-ticket lifecycle: guest/authenticated submission with
 * per-email spam cap, owner history, and staff triage queue.
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  async createTicket(
    dto: CreateSupportTicketDto,
    reporterUserId: string | null,
  ): Promise<SupportTicketEntity> {
    const email = dto.email.trim().toLowerCase();
    const since = new Date(Date.now() - DAY_MS);
    const recentCount = await this.ticketRepo.count({
      where: { email, createdAt: MoreThan(since) },
    });
    if (recentCount >= SUPPORT_TICKET_DAILY_CAP_PER_EMAIL) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many support requests from this email address. Please try again tomorrow.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const ticket = this.ticketRepo.create({
      name: dto.name.trim(),
      email,
      phoneE164: normalizeTicketPhone(dto.phone),
      category: (dto.category ?? 'general') as SupportTicketEntity['category'],
      message: dto.message.trim(),
      status: 'submitted',
      reporterUserId,
    });
    const saved = await this.ticketRepo.save(ticket);

    await this.auditService
      .record({
        actorUserId: reporterUserId,
        action: 'support.ticket.submitted',
        resourceType: 'support_ticket',
        resourceId: saved.id,
        safeMetadata: { category: saved.category },
      })
      .catch((err: unknown) =>
        this.logger.warn(`Failed to audit support ticket submission: ${err}`),
      );

    return saved;
  }

  /** Authenticated filer's own ticket history (newest first). */
  async listMine(userId: string): Promise<SupportTicketEntity[]> {
    return this.ticketRepo.find({
      where: { reporterUserId: userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  /** Staff triage queue with optional status filter (filters before paging). */
  async listTickets(query: QuerySupportTicketsDto): Promise<{
    tickets: SupportTicketEntity[];
    total: number;
  }> {
    const limit = Math.min(query.limit || 20, 100);
    const offset = query.offset || 0;
    // ValidationPipe guarantees membership at the HTTP boundary; the narrow
    // keeps direct service callers honest without trusting raw strings.
    const status =
      query.status && (SUPPORT_TICKET_STATUSES as readonly string[]).includes(query.status)
        ? (query.status as SupportTicketEntity['status'])
        : undefined;
    const where = status ? { status } : {};
    const [tickets, total] = await this.ticketRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
    return { tickets, total };
  }

  async updateStatus(
    staff: AuthenticatedUser,
    ticketId: string,
    dto: UpdateSupportTicketDto,
  ): Promise<SupportTicketEntity> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Support ticket ${ticketId} not found`);
    }
    const status = dto.status as SupportTicketEntity['status'];
    ticket.status = status;
    if (([...SUPPORT_TICKET_TERMINAL_STATUSES] as string[]).includes(status)) {
      ticket.resolvedBy = staff.id;
      ticket.resolvedAt = new Date();
    }
    if (dto.resolutionNotes !== undefined) {
      ticket.resolutionNotes = dto.resolutionNotes;
    }
    const saved = await this.ticketRepo.save(ticket);

    await this.auditService.record({
      actorUserId: staff.id,
      action: 'support.ticket.triaged',
      resourceType: 'support_ticket',
      resourceId: saved.id,
      safeMetadata: { status },
    });

    return saved;
  }
}
