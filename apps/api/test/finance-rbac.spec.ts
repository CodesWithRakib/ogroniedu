import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminFinanceController } from '../src/modules/payments/admin-finance.controller';
import { TutorFinanceController } from '../src/modules/payments/tutor-finance.controller';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../src/common/auth/role.utils';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Finance RBAC and role permission matrix', () => {
  let rolesGuard: RolesGuard;
  const refunds = {
    listForFinance: vi.fn().mockResolvedValue([]),
    decide: vi.fn().mockResolvedValue({ id: 'r1', status: 'approved' }),
    process: vi.fn().mockResolvedValue({ refund: { id: 'r1' }, manualConfirmationRequired: true }),
    confirmManual: vi.fn().mockResolvedValue({ id: 'r1', status: 'succeeded' }),
  };
  const payouts = {
    listForFinance: vi.fn().mockResolvedValue([]),
    approve: vi.fn().mockResolvedValue({ id: 'p1', status: 'approved' }),
    reject: vi.fn().mockResolvedValue({ id: 'p1', status: 'rejected' }),
    markPaid: vi.fn().mockResolvedValue({ id: 'p1', status: 'paid' }),
    markFailed: vi.fn().mockResolvedValue({ id: 'p1', status: 'failed' }),
  };
  const settlement = {
    runReconciliation: vi.fn().mockResolvedValue({ isLedgerBalanced: true }),
  };
  const commission = {
    listVersions: vi.fn().mockResolvedValue([]),
    createVersion: vi.fn().mockResolvedValue({ version: 2 }),
  };
  const ledger = {
    getAccountBalance: vi.fn().mockResolvedValue(100000n),
    runReconciliation: vi.fn().mockResolvedValue({ isBalanced: true }),
  };

  const adminFinance = new AdminFinanceController(
    refunds as any,
    payouts as any,
    settlement as any,
    commission as any,
    ledger as any,
  );
  const admin: AuthenticatedUser = { id: 'admin-1', roles: ['admin'] };
  const superAdmin: AuthenticatedUser = { id: 'super-1', roles: ['super_admin'] };

  function context(user: AuthenticatedUser | undefined, target: any = AdminFinanceController) {
    return {
      getHandler: () => () => {},
      getClass: () => target,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    const reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  it('marks the admin finance controller as admin/super_admin only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminFinanceController)).toEqual([...ADMIN_ROLES]);
  });

  it('marks the tutor finance controller as tutor only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, TutorFinanceController)).toEqual(['tutor']);
  });

  it('allows admin and super_admin through the finance guard', () => {
    expect(rolesGuard.canActivate(context(admin))).toBe(true);
    expect(rolesGuard.canActivate(context(superAdmin))).toBe(true);
  });

  it.each([
    ['student', ['student']],
    ['tutor', ['tutor']],
    ['guardian', ['guardian']],
    ['support agent', ['support_agent']],
    ['compliance reviewer', ['compliance_reviewer']],
    ['organization admin', ['organization_admin']],
    ['organization owner', ['organization_owner']],
  ])('denies %s from platform finance routes', (_label, roles) => {
    expect(() => rolesGuard.canActivate(context({ id: 'x', roles }))).toThrow(ForbiddenException);
  });

  it('denies a role-less request', () => {
    expect(() => rolesGuard.canActivate(context({ id: 'x', roles: [] }))).toThrow(
      ForbiddenException,
    );
  });

  it('denies a non-tutor at the tutor finance route', () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(
      Reflect.getMetadata(ROLES_KEY, TutorFinanceController),
    );
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(context({ id: 's1', roles: ['student'] }, TutorFinanceController)),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(context({ id: 't1', roles: ['tutor'] }, TutorFinanceController))).toBe(
      true,
    );
  });

  describe('admin finance route delegation', () => {
    it('lists the refund queue', async () => {
      const res = await adminFinance.listRefunds({ status: 'requested' });
      expect(res.success).toBe(true);
      expect(refunds.listForFinance).toHaveBeenCalledWith('requested');
    });

    it('decides a refund as the acting operator', async () => {
      const dto = { decision: 'approve' as const };
      const res = await adminFinance.decideRefund(admin, 'r1', dto);
      expect(res.data.status).toBe('approved');
      expect(refunds.decide).toHaveBeenCalledWith(admin, 'r1', dto);
    });

    it('returns a manual-confirmation instruction when provider refunds are unsupported', async () => {
      const res = await adminFinance.processRefund(admin, 'r1');
      expect(res.message).toContain('record the reference');
      expect(res.data.manualConfirmationRequired).toBe(true);
    });

    it('confirms a manual refund with the real external reference', async () => {
      const dto = { externalReference: 'BANK-TXN-1' };
      await adminFinance.confirmManualRefund(admin, 'r1', dto);
      expect(refunds.confirmManual).toHaveBeenCalledWith(admin, 'r1', dto);
    });

    it('delegates payout approval, rejection, payment and failure', async () => {
      await adminFinance.approvePayout(admin, 'p1');
      await adminFinance.rejectPayout(admin, 'p1', { reason: 'Account mismatch' });
      await adminFinance.markPayoutPaid(admin, 'p1', { externalReference: 'BKASH-1' });
      await adminFinance.markPayoutFailed(admin, 'p1', { reason: 'Bank rejected' });

      expect(payouts.approve).toHaveBeenCalledWith(admin, 'p1');
      expect(payouts.reject).toHaveBeenCalledWith(admin, 'p1', { reason: 'Account mismatch' });
      expect(payouts.markPaid).toHaveBeenCalledWith(admin, 'p1', {
        externalReference: 'BKASH-1',
      });
      expect(payouts.markFailed).toHaveBeenCalledWith(admin, 'p1', { reason: 'Bank rejected' });
    });

    it('runs reconciliation and reports ledger balance in poisha', async () => {
      const recon = await adminFinance.runReconciliation(admin);
      expect(recon.data.isLedgerBalanced).toBe(true);
      expect(settlement.runReconciliation).toHaveBeenCalledWith(admin);

      const balance = await adminFinance.getLedgerBalance('2100');
      expect(balance.data).toEqual({ accountCode: '2100', balancePoisha: '100000' });
    });

    it('creates a new commission policy version', async () => {
      const res = await adminFinance.createCommissionPolicy(admin, {
        platformFeeBps: 1000,
        minPayoutMinor: 50000,
      });
      expect(res.data.version).toBe(2);
      expect(commission.createVersion).toHaveBeenCalledWith(admin, {
        platformFeeBps: 1000,
        minPayoutMinor: 50000,
      });
    });
  });
});
