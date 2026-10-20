import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from '../src/modules/payments/services/invoices.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let mockInvoiceRepo: any;

  const payerId = '11111111-1111-4111-8111-111111111111';
  const studentId = '22222222-2222-4222-8222-222222222222';
  const strangerId = '99999999-9999-4999-8999-999999999999';

  const payer: AuthenticatedUser = { id: payerId, email: 'p@example.com', roles: ['student'] };
  const admin: AuthenticatedUser = { id: 'admin-1', email: 'a@example.com', roles: ['admin'] };

  let invoice: any;

  beforeEach(() => {
    invoice = {
      id: 'invoice-1',
      invoiceNumber: 'INV-2026-000042',
      paymentOrderId: 'order-1',
      bookingId: 'booking-1',
      payerUserId: payerId,
      studentUserId: studentId,
      tutorUserId: 'tutor-1',
      currency: 'BDT',
      subtotalMinor: '100000',
      totalMinor: '100000',
      commissionRateBps: 800,
      commissionMinor: '8000',
      status: 'issued',
      issuedAt: new Date('2026-10-20T10:00:00.000Z'),
      snapshot: {
        payerName: 'Rahim',
        studentName: 'Rahim',
        tutorName: 'Tutor <One>',
        subjectName: 'Mathematics',
        bookingReference: '#BBBBBBBB',
        sessionCount: 1,
      },
    };

    mockInvoiceRepo = {
      findOne: vi.fn().mockResolvedValue(invoice),
    };

    service = new InvoicesService(mockInvoiceRepo);
  });

  describe('creation', () => {
    it('allocates the invoice number from the database sequence inside the transaction', async () => {
      const manager: any = {
        findOne: vi.fn().mockResolvedValue(null),
        query: vi.fn().mockResolvedValue([{ nextval: '42' }]),
        create: vi.fn((_entity, data) => ({ ...data, id: 'invoice-1' })),
        save: vi.fn(async (value) => value),
      };
      const order: any = {
        id: 'order-1',
        bookingId: 'booking-1',
        payerUserId: payerId,
        amountMinor: '100000',
        currency: 'BDT',
        payerUser: { displayName: 'Rahim' },
      };
      const booking: any = {
        id: 'booking-1',
        studentUserId: studentId,
        tutorUserId: 'tutor-1',
        studentUser: { displayName: 'Rahim' },
        tutorProfile: { user: { displayName: 'Tutor One' } },
        subject: { nameEn: 'Mathematics' },
      };

      const created = await service.createForOrder(manager, order, booking, 800);

      expect(created.invoiceNumber).toBe(`INV-${new Date().getUTCFullYear()}-000042`);
      expect(created.subtotalMinor).toBe('100000');
      expect(created.totalMinor).toBe('100000');
      expect(created.commissionMinor).toBe('8000');
      expect(manager.save).toHaveBeenCalled();
    });

    it('returns the existing invoice for a repeated payment instead of allocating another number', async () => {
      const manager: any = {
        findOne: vi.fn().mockResolvedValue(invoice),
        query: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
      };

      const existing = await service.createForOrder(manager, {} as any, {} as any, 800);

      expect(existing).toBe(invoice);
      expect(manager.query).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('record-level access', () => {
    it('allows the payer, the student, and admins', async () => {
      await expect(service.getInvoice(payer, 'invoice-1')).resolves.toBe(invoice);
      await expect(
        service.getInvoice(
          { id: studentId, email: 's@example.com', roles: ['student'] },
          'invoice-1',
        ),
      ).resolves.toBe(invoice);
      await expect(service.getInvoice(admin, 'invoice-1')).resolves.toBe(invoice);
    });

    it('denies an unrelated user', async () => {
      await expect(
        service.getInvoice(
          { id: strangerId, email: 'x@example.com', roles: ['student'] },
          'invoice-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when the invoice does not exist', async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);
      await expect(service.getInvoice(payer, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('printable HTML', () => {
    it('escapes snapshot values and renders BDT totals', async () => {
      const html = await service.renderInvoiceHtml(payer, 'invoice-1', 'en');

      expect(html).toContain('INV-2026-000042');
      expect(html).toContain('BDT 1000.00');
      expect(html).toContain('BDT 80.00');
      expect(html).toContain('Tutor &lt;One&gt;');
      expect(html).not.toContain('Tutor <One>');
      expect(html).toContain('Press Ctrl/Cmd + P to print.');
    });

    it('renders a Bangla print variant', async () => {
      const html = await service.renderInvoiceHtml(payer, 'invoice-1', 'bn');

      expect(html).toContain('lang="bn"');
      expect(html).toContain('মোট পরিশোধিত');
    });
  });
});
