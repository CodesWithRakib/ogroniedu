import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeCsvCell, arrayToCsv } from '../src/modules/analytics/utils/csv-sanitizer.util';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Report Exporting & Anti-Formula Injection (Phase 09)', () => {
  describe('1. CSV Formula Injection Defense (CWE-1236)', () => {
    it('should prepend single quote to cell starting with =', () => {
      expect(sanitizeCsvCell('=cmd|calc!A0')).toBe('\'=cmd|calc!A0');
      expect(sanitizeCsvCell('=cmd|"/C calc"!A0')).toBe('"\'=cmd|""/C calc""!A0"');
    });

    it('should prepend single quote to cell starting with +', () => {
      expect(sanitizeCsvCell('+12345')).toBe('\'+12345');
    });

    it('should prepend single quote to cell starting with -', () => {
      expect(sanitizeCsvCell('-5+5')).toBe('\'-5+5');
    });

    it('should prepend single quote to cell starting with @', () => {
      expect(sanitizeCsvCell('@SUM(1+1)')).toBe('\'@SUM(1+1)');
    });

    it('should leave safe alphanumeric string unescaped without leading quote', () => {
      expect(sanitizeCsvCell('Dr. Nusrat Jahan')).toBe('Dr. Nusrat Jahan');
    });

    it('should properly wrap cells containing commas and quotes', () => {
      expect(sanitizeCsvCell('Dhaka, Bangladesh')).toBe('"Dhaka, Bangladesh"');
      expect(sanitizeCsvCell('He said "Hello"')).toBe('"He said ""Hello"""');
    });
  });

  describe('2. Array to CSV Serialization', () => {
    it('should serialize records and neutralize malicious formula injection in headers and data', () => {
      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'role', header: 'Role' },
        { key: 'comment', header: 'Comment' },
      ];
      const rows = [
        { name: 'Alice', role: 'student', comment: 'Great lesson' },
        { name: '=DDE("cmd";"calc")', role: 'tutor', comment: '@malicious' },
      ];

      const csv = arrayToCsv(columns, rows);
      const lines = csv.split('\r\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('Name,Role,Comment');
      expect(lines[1]).toBe('Alice,student,Great lesson');
      // Line 2 must be sanitized with prepended single quote and RFC 4180 quotes!
      expect(lines[2]).toBe('"\'=DDE(""cmd"";""calc"")",tutor,\'@malicious');
    });
  });

  describe('3. AnalyticsService Report Export Execution', () => {
    let service: AnalyticsService;
    let mockDataSource: any;
    let mockLedgerService: any;
    let mockTutorAnalytics: any;
    let mockAuditService: any;

    const adminUser: AuthenticatedUser = {
      id: 'admin-uuid-1',
      email: 'admin@ogroniedu.com',
      roles: ['admin'],
    };

    beforeEach(() => {
      mockDataSource = {
        query: vi.fn().mockResolvedValue([
          {
            id: 'u1',
            display_name: 'Normal User',
            email: 'user@example.com',
            phone_e164: '+8801700000000',
            status: 'active',
            created_at: new Date('2026-01-01'),
          },
          {
            id: 'u2',
            display_name: '=2+5',
            email: 'calc@example.com',
            phone_e164: '+8801700000001',
            status: 'suspended',
            created_at: new Date('2026-01-02'),
          },
        ]),
      };
      mockLedgerService = {};
      mockTutorAnalytics = {};
      mockAuditService = {
        record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      };

      service = new AnalyticsService(
        mockDataSource,
        mockLedgerService,
        mockTutorAnalytics,
        mockAuditService,
      );
    });

    it('should generate formula-safe CSV and record audit log', async () => {
      const result = await service.exportReport(adminUser, {
        reportType: 'users',
        limit: 100,
      });

      expect(result.filename).toContain('report-users-');
      expect(result.rowCount).toBe(2);
      expect(result.csv).toContain('\'=2+5'); // Neutralized!

      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.report.exported',
          actorUserId: adminUser.id,
          safeMetadata: expect.objectContaining({
            reportType: 'users',
            rowCount: 2,
          }),
        }),
      );
    });
  });
});
