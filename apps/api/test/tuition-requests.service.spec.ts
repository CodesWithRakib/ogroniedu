import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { TuitionRequestsService } from '../src/modules/tuition-requests/tuition-requests.service';
import type { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('TuitionRequestsService', () => {
  let service: TuitionRequestsService;
  let requestRepo: any;
  let suggestionRepo: any;
  let appRepo: any;
  let subjectRepo: any;
  let tutorRepo: any;
  let tutorSubjectRepo: any;
  let serviceAreaRepo: any;
  let userRepo: any;
  let roleRepo: any;
  let userRoleRepo: any;
  let studentProfileRepo: any;
  let linkRepo: any;

  const mockUser: AuthenticatedUser = {
    id: '11111111-1111-4111-a111-111111111111',
    roles: ['guardian'],
    preferredLocale: 'bn',
  };

  const mockAdminUser: AuthenticatedUser = {
    id: '00000000-0000-4000-a000-000000000000',
    roles: ['admin'],
    preferredLocale: 'bn',
  };

  const mockTutorUser: AuthenticatedUser = {
    id: '22222222-2222-4222-b222-222222222222',
    roles: ['tutor'],
    preferredLocale: 'bn',
  };

  beforeEach(() => {
    requestRepo = {
      create: vi.fn((data) => ({ id: 'req-1', ...data })),
      save: vi.fn(async (entity) => ({ id: entity.id || 'req-1', requestReference: 'TR-2026-00001', ...entity })),
      findOne: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    suggestionRepo = {
      create: vi.fn((data) => ({ id: 'sug-1', ...data })),
      save: vi.fn(async (entity) => ({ id: entity.id || 'sug-1', ...entity })),
      findOne: vi.fn(),
    };
    appRepo = {
      create: vi.fn((data) => ({ id: 'app-1', ...data })),
      save: vi.fn(async (entity) => ({ id: entity.id || 'app-1', ...entity })),
      findOne: vi.fn(),
      find: vi.fn(),
    };
    subjectRepo = {
      find: vi.fn(),
    };
    tutorRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };
    tutorSubjectRepo = {
      find: vi.fn(),
    };
    serviceAreaRepo = {
      find: vi.fn(),
    };
    userRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: 'usr-student-1', ...data })),
      save: vi.fn(async (entity) => ({ id: entity.id || 'usr-student-1', ...entity })),
    };
    roleRepo = {
      findOne: vi.fn(async () => ({ id: 'role-student-id', code: 'student' })),
    };
    userRoleRepo = {
      create: vi.fn((data) => data),
      save: vi.fn(async (entity) => entity),
    };
    studentProfileRepo = {
      create: vi.fn((data) => data),
      save: vi.fn(async (entity) => entity),
    };
    linkRepo = {
      findOne: vi.fn(async () => null),
      find: vi.fn(async () => []),
      create: vi.fn((data) => ({ id: 'link-1', ...data })),
      save: vi.fn(async (entity) => ({ id: entity.id || 'link-1', ...entity })),
    };

    service = new TuitionRequestsService(
      requestRepo,
      suggestionRepo,
      appRepo,
      subjectRepo,
      tutorRepo,
      tutorSubjectRepo,
      serviceAreaRepo,
      userRepo,
      roleRepo,
      userRoleRepo,
      studentProfileRepo,
      linkRepo,
    );
  });

  describe('createRequest', () => {
    it('should throw BadRequestException if no subject IDs provided', async () => {
      await expect(
        service.createRequest(mockUser, {
          studentName: 'Ahsan',
          subjectIds: [],
          learningMode: 'in_person',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create and return request when valid data provided', async () => {
      subjectRepo.find.mockResolvedValue([{ id: 'sub-1', nameEn: 'Physics' }]);
      requestRepo.findOne.mockResolvedValue({
        id: 'req-1',
        studentName: 'Ahsan',
        guardianUserId: mockUser.id,
        subjects: [{ id: 'sub-1', nameEn: 'Physics' }],
      });

      const res = await service.createRequest(mockUser, {
        studentName: 'Ahsan',
        subjectIds: ['sub-1'],
        learningMode: 'in_person',
        district: 'Dhaka',
        area: 'Dhanmondi',
      });

      expect(requestRepo.create).toHaveBeenCalled();
      expect(res.id).toBe('req-1');
      expect(res.studentName).toBe('Ahsan');
    });
  });

  describe('applyForTuition', () => {
    it('should throw NotFoundException if request does not exist', async () => {
      requestRepo.findOne.mockResolvedValue(null);
      await expect(
        service.applyForTuition('req-none', mockTutorUser, { coverPitch: 'I am ready' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if tutor already applied', async () => {
      requestRepo.findOne.mockResolvedValue({ id: 'req-1', status: 'open' });
      appRepo.findOne.mockResolvedValue({ id: 'app-1' });

      await expect(
        service.applyForTuition('req-1', mockTutorUser, { coverPitch: 'I am ready' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully save application when open and valid', async () => {
      requestRepo.findOne.mockResolvedValue({ id: 'req-1', status: 'open' });
      appRepo.findOne.mockResolvedValue(null);

      const res = await service.applyForTuition('req-1', mockTutorUser, {
        coverPitch: 'I have 4 years experience in HSC Physics',
        proposedSalary: 8000,
      });

      expect(appRepo.create).toHaveBeenCalled();
      expect(res.coverPitch).toContain('HSC Physics');
    });
  });

  describe('suggestTutor', () => {
    it('should allow admin to suggest tutor to guardian', async () => {
      requestRepo.findOne.mockResolvedValue({ id: 'req-1', status: 'open' });
      tutorRepo.findOne.mockResolvedValue({ userId: mockTutorUser.id });
      suggestionRepo.findOne.mockResolvedValue(null);

      const res = await service.suggestTutor('req-1', mockAdminUser, {
        tutorUserId: mockTutorUser.id,
        matchScore: 95,
        adminNote: 'Top BUET civil engineering tutor',
      });

      expect(res.matchScore).toBe(95);
      expect(res.adminNote).toBe('Top BUET civil engineering tutor');
    });
  });

  describe('respondToSuggestion', () => {
    it('should allow guardian to accept suggested tutor', async () => {
      suggestionRepo.findOne.mockResolvedValue({
        id: 'sug-1',
        tutorUserId: mockTutorUser.id,
        request: {
          id: 'req-1',
          guardianUserId: mockUser.id,
          status: 'matched',
        },
      });

      const res = await service.respondToSuggestion('sug-1', mockUser, {
        action: 'accept',
        feedback: 'Looks very qualified, let us start',
      });

      expect(res.status).toBe('accepted_by_guardian');
      expect(res.guardianFeedback).toContain('Looks very qualified');
    });
  });

  describe('getMatchCandidates', () => {
    it('should return all platform tutors ranked by match score', async () => {
      requestRepo.findOne.mockResolvedValue({
        id: 'req-1',
        guardianUserId: mockUser.id,
        subjects: [{ id: 'sub-1', nameEn: 'Physics' }],
        educationLevelId: 'lvl-1',
        district: 'Dhaka',
        area: 'Dhanmondi',
        learningMode: 'in_person',
        preferredTutorGender: 'male',
      });

      tutorRepo.find.mockResolvedValue([
        {
          userId: mockTutorUser.id,
          tutorCode: 'TUT-001',
          publicationStatus: 'published',
          gender: 'male',
          district: 'Dhaka',
          preferredAreas: ['Dhanmondi'],
          subjects: [{ subjectId: 'sub-1', educationLevelId: 'lvl-1' }],
          serviceAreas: [{ districtCode: 'dhaka', localityName: 'Dhanmondi' }],
          qualifications: [{ institution: 'BUET', title: 'B.Sc. in Civil' }],
          user: { displayName: 'Rashed' },
        },
        {
          userId: 'some-other-tutor',
          tutorCode: 'TUT-002',
          publicationStatus: 'draft',
          gender: 'female',
          district: 'Chattogram',
          preferredAreas: ['Agrabad'],
          subjects: [],
          serviceAreas: [],
          qualifications: [],
          user: { displayName: 'Farhana' },
        },
      ]);

      const candidates = await service.getMatchCandidates('req-1');
      expect(candidates.length).toBe(2);
      expect(candidates[0].tutorUserId).toBe(mockTutorUser.id);
      expect(candidates[0].matchScore).toBeGreaterThan(candidates[1].matchScore);
    });
  });
});
