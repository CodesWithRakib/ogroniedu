import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityHeadersMiddleware } from '../src/common/middleware/security-headers.middleware';
import { StructuredLoggerService } from '../src/common/logger/structured-logger.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { FilesService } from '../src/modules/files/files.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PaymentOrdersService } from '../src/modules/payments/services/payment-orders.service';
import { PaymentWebhooksService } from '../src/modules/payments/services/payment-webhooks.service';
import { RefundsService } from '../src/modules/payments/services/refunds.service';
import { SettlementService } from '../src/modules/payments/services/settlement.service';
import { UsersService } from '../src/modules/users/users.service';
import { StudentProfileService } from '../src/modules/users/services/student-profile.service';
import { UserLifecycleService } from '../src/modules/users/services/user-lifecycle.service';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Phase 17 — Security and Privacy Hardening Tests', () => {
  describe('1. OWASP Security Headers Middleware', () => {
    const middleware = new SecurityHeadersMiddleware();

    it('POSITIVE TEST: should attach all critical defensive headers to every HTTP response', () => {
      const headers: Record<string, string> = {};
      const mockRes: Partial<Response> = {
        setHeader: (k: string, v: string) => {
          headers[k] = v;
          return mockRes as Response;
        },
      };
      const mockReq: Partial<Request> = {};
      const next = vi.fn();

      middleware.use(mockReq as Request, mockRes as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('0');
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Permissions-Policy']).toContain('camera=()');
    });
  });

  describe('2. PII & Sensitive Credential Logging Masking', () => {
    const logger = new StructuredLoggerService();

    it('POSITIVE TEST: should mask sensitive keys including passwords, tokens, NID, cards, and OTPs', () => {
      const input = {
        userId: 'usr-123',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        nidNumber: '19981234567890123',
        bankAccountNumber: '1234567890',
        otp: '984512',
      };

      const masked = logger.maskPii(input);
      expect(masked.userId).toBe('usr-123');
      expect(masked.password).toBe('***MASKED***');
      expect(masked.token).toBe('***MASKED***');
      expect(masked.nidNumber).toBe('***MASKED***');
      expect(masked.bankAccountNumber).toBe('***MASKED***');
      expect(masked.otp).toBe('***MASKED***');
    });

    it('POSITIVE TEST: should redact Bangladeshi phone numbers and email addresses in string fields', () => {
      const input = {
        contactPhone: '+8801712345678',
        emailAddress: 'learner.parent@example.com',
      };

      const masked = logger.maskPii(input);
      expect(masked.contactPhone).toBe('1712****78');
      expect(masked.emailAddress).toBe('l***@example.com');
    });
  });

  describe('3. Information Disclosure & Error Sanitization', () => {
    const filter = new AllExceptionsFilter();

    it('POSITIVE TEST: should mask raw internal database errors in 500 response', () => {
      let status = 0;
      let body: any = null;

      const mockRes: Partial<Response> = {
        status: (code: number) => {
          status = code;
          return {
            json: (b: any) => {
              body = b;
            },
          } as any;
        },
      };

      const mockReq: Partial<Request> = {
        url: '/api/v1/payments/sensitive-query',
        method: 'POST',
        requestId: 'req-sec-500',
      };

      const mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockReq as Request,
          getResponse: () => mockRes as Response,
        }),
      } as any;

      filter.catch(
        new Error('FATAL: syntax error at or near "SELECT * FROM users WHERE password="'),
        mockHost,
      );

      expect(status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      // Must not leak the raw SQL query to the client
      expect(JSON.stringify(body)).not.toContain('syntax error at or near');
      expect(body.error.message).toBe(
        'Internal server error. Please contact support with request ID.',
      );
      expect(body.meta.requestId).toBe('req-sec-500');
    });
  });

  describe('4. File Upload Hardening & Anti-MIME Spoofing', () => {
    let filesService: FilesService;
    let mockFileRepo: any;

    const testTutor: AuthenticatedUser = {
      id: 'tutor-uuid-1',
      email: 'tutor@example.com',
      roles: ['tutor'],
    };

    const intruderUser: AuthenticatedUser = {
      id: 'intruder-uuid-2',
      email: 'intruder@example.com',
      roles: ['student'],
    };

    beforeEach(() => {
      mockFileRepo = {
        create: vi.fn((e) => ({ ...e, id: 'file-uuid-1' })),
        save: vi.fn((e) => Promise.resolve(e)),
        findOne: vi.fn(),
      };
      filesService = new FilesService(mockFileRepo);
    });

    it('POSITIVE TEST: should accept valid PDF with genuine magic header bytes (%PDF)', async () => {
      // '%PDF-1.4' in base64 is 'JVBERi0xLjQ='
      const pdfBase64 = Buffer.from('%PDF-1.4 test document content').toString('base64');
      const result = await filesService.uploadEvidence(testTutor, {
        purpose: 'nid',
        originalFilename: 'nid_card.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 1024,
        contentBase64: pdfBase64,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('file-uuid-1');
      expect(result.visibility).toBe('private');
    });

    it('NEGATIVE TEST: should detect and reject MIME spoofing (HTML/script pretending to be PDF)', async () => {
      const scriptBase64 = Buffer.from('<script>alert("xss")</script>').toString('base64');

      await expect(
        filesService.uploadEvidence(testTutor, {
          purpose: 'nid',
          originalFilename: 'exploit.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 500,
          contentBase64: scriptBase64,
        }),
      ).rejects.toThrow(/MIME spoofing detected/i);
    });

    it('NEGATIVE TEST: should reject path traversal in originalFilename', async () => {
      const pdfBase64 = Buffer.from('%PDF-1.4 valid').toString('base64');

      await expect(
        filesService.uploadEvidence(testTutor, {
          purpose: 'nid',
          originalFilename: '../../etc/passwd.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 500,
          contentBase64: pdfBase64,
        }),
      ).rejects.toThrow(/path traversal/i);
    });

    it('NEGATIVE TEST: should reject extension mismatch with declared mediaType', async () => {
      const pdfBase64 = Buffer.from('%PDF-1.4 valid').toString('base64');

      await expect(
        filesService.uploadEvidence(testTutor, {
          purpose: 'nid',
          originalFilename: 'certificate.exe',
          mediaType: 'application/pdf',
          sizeBytes: 500,
          contentBase64: pdfBase64,
        }),
      ).rejects.toThrow(/extension does not match/i);
    });

    it('POSITIVE TEST: should generate expiring signed access URL for authorized owner', async () => {
      mockFileRepo.findOne.mockResolvedValue({
        id: 'file-uuid-1',
        ownerUserId: testTutor.id,
        visibility: 'private',
      });

      const access = await filesService.getFileAccess('file-uuid-1', testTutor);
      expect(access.id).toBe('file-uuid-1');
      expect(access.signedAccessToken).toBeDefined();
      expect(access.signedAccessUrl).toContain('/api/v1/files/file-uuid-1/download');
      expect(new Date(access.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('NEGATIVE TEST (BOLA): should reject unauthorized user from accessing private file', async () => {
      mockFileRepo.findOne.mockResolvedValue({
        id: 'file-uuid-1',
        ownerUserId: testTutor.id,
        visibility: 'private',
      });

      await expect(filesService.getFileAccess('file-uuid-1', intruderUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('5. Payment Webhook Anti-Replay & Timestamp Skew Protection', () => {
    let paymentsService: PaymentsService;
    let mockOrderRepo: any;
    let mockTxnRepo: any;
    let mockRefundRepo: any;
    let mockBookingRepo: any;
    let mockSessionRepo: any;
    let mockGuardianLinkRepo: any;
    let mockOutboxRepo: any;
    let mockLedgerService: any;
    let mockFactory: any;
    let mockAuditService: any;
    let mockDataSource: any;

    beforeEach(() => {
      mockOrderRepo = { findOne: vi.fn(), save: vi.fn((o) => Promise.resolve(o)) };
      mockTxnRepo = {
        findOne: vi.fn(),
        create: vi.fn((t) => t),
        save: vi.fn((t) => Promise.resolve(t)),
      };
      mockRefundRepo = { findOne: vi.fn() };
      mockBookingRepo = { findOne: vi.fn(), save: vi.fn((b) => Promise.resolve(b)) };
      mockSessionRepo = { find: vi.fn() };
      mockGuardianLinkRepo = { findOne: vi.fn() };
      mockOutboxRepo = { create: vi.fn((e) => e), save: vi.fn((e) => Promise.resolve(e)) };
      mockLedgerService = { recordOrderEscrowHolding: vi.fn().mockResolvedValue({}) };
      mockAuditService = { record: vi.fn().mockResolvedValue({}) };
      mockDataSource = {
        transaction: vi.fn(async (cb) => {
          return await cb({
            save: vi.fn((x) => Promise.resolve(x)),
            create: vi.fn((_, x) => x),
          });
        }),
      };

      const mockAdapter = {
        verifyWebhookSignature: vi.fn().mockReturnValue(true),
        queryTransaction: vi.fn().mockResolvedValue({ status: 'succeeded' }),
      };

      mockFactory = {
        getAdapter: vi.fn().mockReturnValue(mockAdapter),
      };

      paymentsService = new PaymentsService(
        new PaymentOrdersService(
          mockOrderRepo,
          mockBookingRepo,
          mockGuardianLinkRepo,
          mockFactory,
          mockAuditService,
        ) as never,
        new PaymentWebhooksService(
          mockOrderRepo,
          mockTxnRepo,
          mockGuardianLinkRepo,
          mockLedgerService,
          mockFactory,
          mockAuditService,
          mockDataSource,
        ) as never,
        new RefundsService(
          mockOrderRepo,
          mockRefundRepo,
          mockOutboxRepo,
          mockLedgerService,
          mockFactory,
          mockAuditService,
        ) as never,
        new SettlementService(
          mockSessionRepo,
          mockOrderRepo,
          mockTxnRepo,
          mockLedgerService,
          mockAuditService,
        ) as never,
      );
    });

    it('NEGATIVE TEST: should reject webhook when timestamp is expired by more than 5 minutes (Replay Attack)', async () => {
      const expiredTimestamp = new Date(Date.now() - 600 * 1000).toISOString(); // 10 minutes ago (> 5m tolerance)

      await expect(
        paymentsService.handleWebhook(
          'bkash',
          { 'x-webhook-timestamp': expiredTimestamp },
          {
            providerTransactionId: 'TXN-OLD-1',
            providerEventId: 'EVT-OLD-1',
            amountMinor: 100000,
            currency: 'BDT',
            status: 'succeeded',
          },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('NEGATIVE TEST: should reject webhook if adapter signature verification fails', async () => {
      mockFactory.getAdapter.mockReturnValueOnce({
        verifyWebhookSignature: vi.fn().mockReturnValue(false),
      });

      await expect(
        paymentsService.handleWebhook(
          'bkash',
          { 'x-webhook-timestamp': new Date().toISOString() },
          {
            providerTransactionId: 'TXN-TAMPERED-1',
            providerEventId: 'EVT-TAMPERED-1',
            amountMinor: 100000,
            currency: 'BDT',
            status: 'succeeded',
          },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('6. User Privacy, Data Export & Deletion Safety Invariants', () => {
    let usersService: UsersService;
    let mockUserRepo: any;
    let mockStudentProfileRepo: any;
    let mockSessionRepo: any;
    let mockGuardianLinkRepo: any;
    let mockAuditService: any;
    let mockDataSource: any;
    let mockBookingRepo: any;

    const activeUser = {
      id: 'usr-active-1',
      displayName: 'Active Learner',
      email: 'active@example.com',
      phoneE164: '+8801700000001',
      status: 'active',
    };

    beforeEach(() => {
      mockUserRepo = {
        findOne: vi.fn().mockResolvedValue(activeUser),
        save: vi.fn((u) => Promise.resolve(u)),
      };
      mockStudentProfileRepo = { findOne: vi.fn().mockResolvedValue(null) };
      mockSessionRepo = {
        find: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({ affected: 1 }),
      };
      mockGuardianLinkRepo = { find: vi.fn().mockResolvedValue([]) };
      mockAuditService = {
        record: vi.fn().mockResolvedValue({}),
        getUserAuditHistory: vi.fn().mockResolvedValue([]),
      };
      mockDataSource = { query: vi.fn().mockResolvedValue([]) };
      mockBookingRepo = { find: vi.fn().mockResolvedValue([]) };

      usersService = new UsersService(
        mockUserRepo,
        mockStudentProfileRepo,
        mockDataSource,
        mockAuditService,
        new StudentProfileService(mockUserRepo, mockStudentProfileRepo, mockAuditService),
        new UserLifecycleService(
          mockUserRepo,
          mockStudentProfileRepo,
          mockSessionRepo,
          mockGuardianLinkRepo,
          mockAuditService,
          mockBookingRepo,
        ),
      );
    });

    it('NEGATIVE TEST: should reject account deletion if user has active tutoring bookings', async () => {
      mockBookingRepo.find.mockResolvedValueOnce([{ id: 'booking-active-1', status: 'confirmed' }]);

      await expect(
        usersService.deleteAccount('usr-active-1', 'Need to leave platform'),
      ).rejects.toThrow(BadRequestException);
    });

    it('POSITIVE TEST: should allow deletion scheduling and revoke sessions for user with no active bookings', async () => {
      mockBookingRepo.find.mockResolvedValueOnce([]); // No active bookings

      const result = await usersService.deleteAccount('usr-active-1', 'Personal reasons');
      expect(result.success).toBe(true);
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'deletion_pending' }),
      );
      expect(mockSessionRepo.update).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.account.deletion_requested',
          safeMetadata: expect.objectContaining({ retentionHoldDays: 30 }),
        }),
      );
    });

    it('POSITIVE TEST: should export structured data including bookings without exposing sensitive hashes', async () => {
      mockBookingRepo.find.mockResolvedValueOnce([
        {
          id: 'booking-exp-1',
          status: 'completed',
          mode: 'online',
          pricePerSessionMinor: '50000',
          currency: 'BDT',
          durationMinutes: 60,
          createdAt: new Date(),
        },
      ]);

      const exportData = await usersService.exportUserData('usr-active-1');
      expect(exportData.user).toBeDefined();
      expect((exportData.user as any).id).toBe('usr-active-1');
      expect((exportData.user as any).passwordHash).toBeUndefined();
      expect((exportData as any).bookings).toHaveLength(1);
      expect((exportData as any).bookings[0].id).toBe('booking-exp-1');
    });
  });
});
