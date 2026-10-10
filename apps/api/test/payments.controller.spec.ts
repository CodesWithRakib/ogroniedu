import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { LedgerService } from '../src/modules/payments/ledger.service';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('PaymentsController Unit Tests', () => {
  let controller: PaymentsController;
  let mockPaymentsService: any;
  let mockLedgerService: any;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
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
      processRefund: vi.fn().mockResolvedValue({
        id: 'refund-1',
        amountMinor: 50000,
        status: 'succeeded',
      }),
      settleMilestone: vi.fn().mockResolvedValue({
        id: 'journal-settle-1',
        description: 'Settled session milestone',
      }),
      getPaymentReceipt: vi.fn().mockResolvedValue({
        receiptId: 'REC-123',
        amountBdt: '1000.00',
      }),
      runReconciliation: vi.fn().mockResolvedValue({
        isLedgerBalanced: true,
        totalOrders: 5,
      }),
    };

    mockLedgerService = {
      getAccountBalance: vi.fn().mockResolvedValue(100000n),
    };

    controller = new PaymentsController(
      mockPaymentsService as unknown as PaymentsService,
      mockLedgerService as unknown as LedgerService,
    );
  });

  it('should create payment order and return 201 wrapped response', async () => {
    const dto: any = { bookingId: 'booking-uuid-1', provider: 'bkash' };
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

  it('should handle webhook and return 200 wrapped response', async () => {
    const body: any = {
      providerTransactionId: 'TRX-1',
      providerEventId: 'EVT-1',
      amountMinor: 100000,
      currency: 'BDT',
      status: 'succeeded',
    };
    const res = await controller.handleWebhook('bkash', {}, body, 'req-2');
    expect(res.success).toBe(true);
    expect(res.data.status).toBe('succeeded');
    expect(mockPaymentsService.handleWebhook).toHaveBeenCalledWith('bkash', {}, body, 'req-2');
  });

  it('should process refund and return 200 wrapped response', async () => {
    const dto: any = { paymentOrderId: 'order-1', amountMinor: 50000, reason: 'Cancellation' };
    const res = await controller.processRefund(mockUser, dto, 'req-3');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('refund-1');
    expect(mockPaymentsService.processRefund).toHaveBeenCalledWith(mockUser, dto, 'req-3');
  });

  it('should settle session milestone and return 200 wrapped response', async () => {
    const dto: any = { sessionId: 'session-1' };
    const res = await controller.settleMilestone(mockUser, dto, 'req-4');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('journal-settle-1');
    expect(mockPaymentsService.settleMilestone).toHaveBeenCalledWith(mockUser, dto, 'req-4');
  });

  it('should get payment receipt', async () => {
    const res = await controller.getPaymentReceipt(mockUser, '00000000-0000-4000-8000-000000000000');
    expect(res.success).toBe(true);
    expect(res.data.receiptId).toBe('REC-123');
  });

  it('should get reconciliation audit report', async () => {
    const res = await controller.runReconciliation();
    expect(res.success).toBe(true);
    expect(res.data.isLedgerBalanced).toBe(true);
  });

  it('should get ledger account balance', async () => {
    const res = await controller.getLedgerBalance('1000');
    expect(res.success).toBe(true);
    expect(res.data.accountCode).toBe('1000');
    expect(res.data.balancePoisha).toBe('100000');
    expect(res.data.balanceBdt).toBe('1000.00');
  });
});
