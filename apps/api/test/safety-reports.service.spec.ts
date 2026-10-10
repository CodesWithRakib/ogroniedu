import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SafetyReportsService } from '../src/modules/trust/safety-reports.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('SafetyReportsService Unit Tests (Phase 13)', () => {
  let service: SafetyReportsService;
  let mockReportRepo: any;
  let mockOutboxRepo: any;
  let mockAuditRepo: any;
  let mockNotificationService: any;

  const reporterId = '00000000-0000-4000-8000-000000000001';
  const reportedUserId = '00000000-0000-4000-8000-000000000002';
  const intruderId = '00000000-0000-4000-8000-000000000099';

  const reporterUser: AuthenticatedUser = {
    id: reporterId,
    email: 'reporter@example.com',
    roles: ['student'],
  };

  const intruderUser: AuthenticatedUser = {
    id: intruderId,
    email: 'intruder@example.com',
    roles: ['tutor'],
  };

  const adminUser: AuthenticatedUser = {
    id: '00000000-0000-4000-8000-000000000000',
    email: 'safety-admin@example.com',
    roles: ['admin'],
  };

  beforeEach(() => {
    mockReportRepo = {
      create: vi.fn((data) => ({ id: 'rep-1', createdAt: new Date(), ...data })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'rep-1', ...entity })),
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockOutboxRepo = {
      create: vi.fn((data) => ({ id: 'out-1', ...data })),
      save: vi.fn().mockResolvedValue({ id: 'out-1' }),
    };

    mockAuditRepo = {
      create: vi.fn((data) => ({ id: 'aud-1', ...data })),
      save: vi.fn().mockResolvedValue({ id: 'aud-1' }),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new SafetyReportsService(
      mockReportRepo,
      mockOutboxRepo,
      mockAuditRepo,
      mockNotificationService,
    );
  });

  describe('Report Intake & Urgent Child Safety Escalation', () => {
    it('should file standard harassment report with medium severity', async () => {
      const res = await service.createReport(reporterUser, {
        reportedUserId,
        category: 'harassment',
        severity: 'medium',
        description: 'Tutor used rude and unprofessional language during the session.',
      });

      expect(res.id).toBe('rep-1');
      expect(res.reporterUserId).toBe(reporterId);
      expect(res.category).toBe('harassment');
      expect(res.escalationLevel).toBe('standard');
      expect(res.status).toBe('submitted');
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(mockOutboxRepo.save).toHaveBeenCalled();
    });

    it('CHILD SAFETY INVARIANT: should automatically escalate child safety reports with urgent level', async () => {
      const res = await service.createReport(reporterUser, {
        reportedUserId,
        category: 'child_safety',
        severity: 'high',
        description: 'Tutor requested minor student to meet outside the scheduled home location.',
      });

      expect(res.escalationLevel).toBe('urgent_child_safety');
      expect(res.status).toBe('escalated');
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(mockOutboxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'safety.critical_escalation',
        }),
      );
    });

    it('SEVERITY INVARIANT: critical severity report should automatically trigger urgent escalation', async () => {
      const res = await service.createReport(reporterUser, {
        reportedUserId,
        category: 'fraud_billing',
        severity: 'critical',
        description: 'Suspected identity fraud and fake academic credentials discovered.',
      });

      expect(res.escalationLevel).toBe('urgent_child_safety');
      expect(res.status).toBe('escalated');
    });
  });

  describe('ABAC Scoping & Confidential Evidence Access', () => {
    it('should allow reporter to view their own filed report', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-1',
        reporterUserId: reporterId,
        category: 'harassment',
        evidenceAssetIds: ['00000000-0000-4000-8000-000000000010'],
      });

      const res = await service.getReport(reporterUser, 'rep-1');
      expect(res.id).toBe('rep-1');
      expect(res.reporterUserId).toBe(reporterId);
    });

    it('should allow admin to inspect confidential safety reports and evidence', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-1',
        reporterUserId: reporterId,
        category: 'child_safety',
      });

      const res = await service.getReport(adminUser, 'rep-1');
      expect(res.id).toBe('rep-1');
    });

    it('NEGATIVE TEST: should strictly deny reported user or unrelated user from viewing confidential report (403 Forbidden)', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-1',
        reporterUserId: reporterId,
        reportedUserId: intruderId,
      });

      await expect(service.getReport(intruderUser, 'rep-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Investigation Status Updates', () => {
    it('should allow admin to resolve or update investigation status', async () => {
      mockReportRepo.findOne.mockResolvedValueOnce({
        id: 'rep-1',
        status: 'submitted',
      });

      const res = await service.updateReport(adminUser, 'rep-1', {
        status: 'action_taken',
        resolutionNotes: 'Tutor account formally warned and flagged for monitoring.',
      });

      expect(res.status).toBe('action_taken');
      expect(res.resolutionNotes).toContain('formally warned');
      expect(mockAuditRepo.save).toHaveBeenCalled();
    });

    it('NEGATIVE TEST: should reject non-admin from updating report investigation status (403 Forbidden)', async () => {
      await expect(
        service.updateReport(reporterUser, 'rep-1', {
          status: 'dismissed',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
