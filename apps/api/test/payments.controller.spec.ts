import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoneException } from '@nestjs/common';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { InvoicesService } from '../src/modules/payments/services/invoices.service';
import { RefundsService } from '../src/modules/payments/services/refunds.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockPaymentsService: any;
  let mockInvoicesService: any;
  let mockRefundsService: any;

  const mockUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    roles: ['student'],
    email: 'student@example.com',
  };

  beforeEach(() => {
    mockPaymentsService = {
      createPaymentOrder: vi.fn().mockResolvedValue({
        orderId: 'order-1',
        checkoutUrl: 'https://sandbox.bkash.com',
        amountMinor: 100000,
        currency: 'BDT',
        status: 'pending',
      }),
      handleWebhook: vi.fn().mockResolvedValue({
        received: true,
        processed: true,
        status: 'succeeded',
      }),
      settleMilestone: vi.fn().mockResolvedValue({
        id: 'journal-settle-1',
        description: 'Settled session milestone',
      }),
      getPaymentReceipt: vi.fn().mockResolvedValue({
        receiptId: 'INV-2026-000001',
        amountBdt: '1000.00',
      }),
      getMyPaymentOrders: vi
        .fn()
        .mockResolvedValue([{ id: 'order-1', status: 'succeeded', amountMinor: '100000' }]),
    };

    mockInvoicesService = {
      getInvoice: vi.fn().mockResolvedValue({ id: 'invoice-1', invoiceNumber: 'INV-2026-000001' }),
      renderInvoiceHtml: vi.fn().mockResolvedValue('<html>invoice</html>'),
    };

    mockRefundsService = {
      requestRefund: vi.fn().mockResolvedValue({
        id: 'refund-1',
        amountMinor: '50000',
        status: 'requested',
      }),
      listMine: vi.fn().mockResolvedValue([{ id: 'refund-1', status: 'requested' }]),
      getRefund: vi.fn().mockResolvedValue({ id: 'refund-1', status: 'requested' }),
    };

    controller = new PaymentsController(
      mockPaymentsService as unknown as PaymentsService,
      mockInvoicesService as unknown as InvoicesService,
      mockRefundsService as unknown as RefundsService,
    );
  });

  it('creates a payment order and returns a wrapped 201 payload', async () => {
    const dto: any = { bookingId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', provider: 'bkash' };
    const res = await controller.createPaymentOrder(mockUser, dto, 'idem-1', 'req-1');

    expect(res.success).toBe(true);
    expect(res.data.orderId).toBe('order-1');
    expect(mockPaymentsService.createPaymentOrder).toHaveBeenCalledWith(
      mockUser,
      dto,
      'idem-1',
      'req-1',
    );
  });

  it('passes the raw request body string to webhook verification', async () => {
    const body: any = {
      providerTransactionId: 'TRX-1',
      providerEventId: 'EVT-1',
      orderReference: '00000000-0000-4000-8000-000000000000',
      amountMinor: 100000,
      currency: 'BDT',
      status: 'succeeded',
    };
    const req = { rawBody: Buffer.from(JSON.stringify(body)) } as any;

    const mockRes = { redirect: vi.fn() } as any;
    const res = (await controller.handleWebhook('bkash', {}, body, req, mockRes, 'req-2')) as any;

    expect(res.success).toBe(true);
    expect(res.data.status).toBe('succeeded');
    expect(mockPaymentsService.handleWebhook).toHaveBeenCalledWith(
      'bkash',
      {},
      body,
      'req-2',
      JSON.stringify(body),
    );
  });

  it('submits a refund request without claiming it succeeded', async () => {
    const dto: any = {
      paymentOrderId: '00000000-0000-4000-8000-000000000000',
      amountMinor: 50000,
      reason: 'Cancellation with adequate notice',
    };
    const res = await controller.requestRefund(mockUser, dto);

    expect(res.success).toBe(true);
    expect(res.data.status).toBe('requested');
    expect(mockRefundsService.requestRefund).toHaveBeenCalledWith(mockUser, dto);
  });

  it('lists the caller-owned refunds', async () => {
    const res = await controller.listMyRefunds(mockUser);

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(mockRefundsService.listMine).toHaveBeenCalledWith(mockUser);
  });

  it('reads a single refund with record-level authorization', async () => {
    const res = await controller.getRefund(mockUser, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    expect(res.success).toBe(true);
    expect(mockRefundsService.getRefund).toHaveBeenCalledWith(
      mockUser,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
  });

  it('settles a session milestone', async () => {
    const dto: any = { sessionId: 'session-1' };
    const res = await controller.settleMilestone(mockUser, dto, 'req-4');

    expect(res.success).toBe(true);
    expect(res.data.id).toBe('journal-settle-1');
    expect(mockPaymentsService.settleMilestone).toHaveBeenCalledWith(mockUser, dto, 'req-4');
  });

  it('returns the payment receipt', async () => {
    const res = await controller.getPaymentReceipt(
      mockUser,
      '00000000-0000-4000-8000-000000000000',
    );

    expect(res.success).toBe(true);
    expect(res.data.receiptId).toBe('INV-2026-000001');
  });

  it('returns a JSON invoice', async () => {
    const res = await controller.getInvoice(mockUser, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    expect(res.success).toBe(true);
    expect(res.data.invoiceNumber).toBe('INV-2026-000001');
    expect(mockInvoicesService.getInvoice).toHaveBeenCalledWith(
      mockUser,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
  });

  it('renders printable invoice HTML in the requested locale', async () => {
    await controller.printInvoice(mockUser, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bn');

    expect(mockInvoicesService.renderInvoiceHtml).toHaveBeenCalledWith(
      mockUser,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bn',
    );
  });

  it('keeps the client-triggerable sandbox confirmation path disabled', async () => {
    await expect(controller.sandboxConfirmOrder()).rejects.toThrow(GoneException);
  });
});
