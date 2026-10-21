import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackController, AdminFeedbackController } from '../src/modules/feedback/feedback.controller';
import { CreateFeedbackDto } from '../src/modules/feedback/dto/create-feedback.dto';
import { TriageFeedbackDto } from '../src/modules/feedback/dto/triage-feedback.dto';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('Beta Feedback Controllers (Phase 12)', () => {
  let controller: FeedbackController;
  let adminController: AdminFeedbackController;
  let mockFeedbackService: any;

  const studentUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'student@example.com',
    roles: ['student'],
  };

  const adminUser: AuthenticatedUser = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'admin@example.com',
    roles: ['admin'],
  };

  const mockRequest = {
    headers: { 'x-forwarded-for': '127.0.0.1' },
    ip: '127.0.0.1',
    requestId: 'req-fb-123',
  } as any;

  beforeEach(() => {
    mockFeedbackService = {
      submitFeedback: vi.fn(async (dto, user) => ({
        id: 'fb-123',
        ...dto,
        reporterUserId: user.id,
        reporterRole: user.roles[0],
        status: 'submitted',
        createdAt: new Date(),
      })),
      getMyFeedback: vi.fn(async (_userId, page, limit) => ({
        items: [{ id: 'fb-123', title: 'Test feedback' }],
        total: 1,
        page,
        limit,
      })),
      getFeedbackById: vi.fn(async (id) => ({
        id,
        title: 'Test feedback item',
        status: 'submitted',
      })),
      queryAdminFeedback: vi.fn(async (query) => ({
        items: [{ id: 'fb-123', title: 'Test feedback item' }],
        total: 1,
        page: query.page,
        limit: query.limit,
        totalPages: 1,
      })),
      triageFeedback: vi.fn(async (id, dto) => ({
        id,
        ...dto,
        status: dto.status || 'triaged',
        severity: dto.severity || 'p2_medium',
      })),
    };

    controller = new FeedbackController(mockFeedbackService);
    adminController = new AdminFeedbackController(mockFeedbackService);
  });

  describe('FeedbackController (User Facing)', () => {
    it('POST /api/v1/feedback wraps response in standard envelope', async () => {
      const dto: CreateFeedbackDto = {
        category: 'bug',
        title: 'Audio issue in classroom',
        description: 'Microphone permission prompt looped on Chrome mobile.',
      };

      const res = await controller.submitFeedback(dto, studentUser, mockRequest);

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('fb-123');
      expect(res.requestId).toBe('req-fb-123');
      expect(mockFeedbackService.submitFeedback).toHaveBeenCalledWith(dto, studentUser, '127.0.0.1');
    });

    it('GET /api/v1/feedback/my returns paginated user feedback', async () => {
      const res = await controller.getMyFeedback(studentUser, '1', '10');

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.meta?.pagination?.page).toBe(1);
      expect(res.meta?.pagination?.pageSize).toBe(10);
    });

    it('GET /api/v1/feedback/:id returns feedback item', async () => {
      const res = await controller.getFeedbackById('fb-123', studentUser, mockRequest);

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('fb-123');
    });
  });

  describe('AdminFeedbackController (Staff Triage)', () => {
    it('GET /api/v1/admin/feedback queries triage queue with metadata', async () => {
      const res = await adminController.queryFeedback({ page: 1, limit: 20 });

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.meta?.pagination?.totalItems).toBe(1);
    });

    it('PATCH /api/v1/admin/feedback/:id/triage updates feedback status and severity', async () => {
      const triageDto: TriageFeedbackDto = {
        severity: 'p1_high',
        status: 'in_progress',
        triageNotes: 'Assigned to audio streaming team',
      };

      const res = await adminController.triageFeedback('fb-123', triageDto, adminUser, mockRequest);

      expect(res.success).toBe(true);
      expect(res.data.severity).toBe('p1_high');
      expect(res.data.status).toBe('in_progress');
    });
  });
});
