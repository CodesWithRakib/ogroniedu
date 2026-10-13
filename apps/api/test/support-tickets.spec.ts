import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { validate } from 'class-validator';
import { SupportService } from '../src/modules/support/support.service';
import { CreateSupportTicketDto } from '../src/modules/support/dto/create-support-ticket.dto';

describe('Support tickets (Phase 22 H-3)', () => {
  let service: SupportService;
  let mockTicketRepo: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findAndCount: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let mockAuditService: { record: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockTicketRepo = {
      count: vi.fn(async () => 0),
      create: vi.fn((dto: unknown) => ({ ...(dto as object) })),
      save: vi.fn(async (entity: unknown) => ({ ...(entity as object), id: 'ticket-1' })),
      find: vi.fn(async () => []),
      findAndCount: vi.fn(async () => [[], 0]),
      findOne: vi.fn(async () => null),
    };
    mockAuditService = { record: vi.fn(async () => ({})) };
    service = new SupportService(mockTicketRepo as never, mockAuditService as never);
  });

  it('creates a guest ticket with normalized email and default status', async () => {
    const dto = Object.assign(new CreateSupportTicketDto(), {
      name: '  Rahim Uddin ',
      email: 'RAHIM@Example.COM ',
      message: 'I need help finding a physics tutor for class 10.',
    });
    const ticket = await service.createTicket(dto, null);
    expect(mockTicketRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rahim Uddin',
        email: 'rahim@example.com',
        status: 'submitted',
        category: 'general',
        reporterUserId: null,
      }),
    );
    expect(ticket.id).toBe('ticket-1');
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'support.ticket.submitted', actorUserId: null }),
    );
  });

  it('links authenticated filers to their ticket', async () => {
    const dto = Object.assign(new CreateSupportTicketDto(), {
      name: 'Karim',
      email: 'karim@example.com',
      message: 'Payment page shows an error after bKash redirect.',
    });
    await service.createTicket(dto, 'user-123');
    expect(mockTicketRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ reporterUserId: 'user-123' }),
    );
  });

  it('rejects the 6th ticket per email per 24h with 429 RATE_LIMITED', async () => {
    mockTicketRepo.count.mockResolvedValueOnce(5);
    const dto = Object.assign(new CreateSupportTicketDto(), {
      name: 'Spammer',
      email: 'spam@example.com',
      message: 'Buy cheap followers now, limited offer here.',
    });
    const err = await service.createTicket(dto, null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    expect(mockTicketRepo.save).not.toHaveBeenCalled();
  });

  it('scopes history to the requesting filer', async () => {
    await service.listMine('user-123');
    expect(mockTicketRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { reporterUserId: 'user-123' } }),
    );
  });

  it('filters the staff queue by status before paging', async () => {
    await service.listTickets({ status: 'submitted', limit: 20, offset: 40 });
    expect(mockTicketRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'submitted' },
        skip: 40,
        take: 20,
      }),
    );
  });

  it('marks terminal statuses resolved with resolver attribution + audit', async () => {
    mockTicketRepo.findOne.mockResolvedValueOnce({ id: 't1', status: 'submitted' });
    const staff = { id: 'admin-1', roles: ['admin'] };
    const saved = await service.updateStatus(staff, 't1', {
      status: 'resolved',
      resolutionNotes: 'Called the user; issue fixed.',
    });
    expect(saved.status).toBe('resolved');
    expect(saved.resolvedBy).toBe('admin-1');
    expect(saved.resolvedAt).toBeInstanceOf(Date);
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'support.ticket.triaged' }),
    );
  });

  it('returns 404 for unknown ticket ids', async () => {
    await expect(
      service.updateStatus({ id: 'admin-1', roles: ['admin'] }, 'missing', { status: 'spam' }),
    ).rejects.toThrow('Support ticket missing not found');
  });

  it('validates the create DTO (email format, message length)', async () => {
    const bad = Object.assign(new CreateSupportTicketDto(), {
      name: 'A',
      email: 'not-an-email',
      message: 'short',
    });
    const errors = await validate(bad);
    const props = errors.map((e) => e.property);
    expect(props).toContain('email');
    expect(props).toContain('message');
  });
});
