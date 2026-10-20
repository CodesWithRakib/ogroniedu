import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { TutorProfileEntity } from '../src/modules/tutors/entities/tutor-profile.entity';
import { SubjectEntity } from '../src/modules/taxonomy/entities/subject.entity';
import { EducationLevelEntity } from '../src/modules/taxonomy/entities/education-level.entity';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';
import { GuardianAccessService } from '../src/modules/guardians/guardian-access.service';

describe('BookingsService Unit & Invariant Tests', () => {
  let service: BookingsService;
  let mockBookingRepo: any;
  let mockTutorProfileRepo: any;
  let mockTutorSubjectRepo: any;
  let mockLinkRepo: any;
  let mockUserRepo: any;
  let mockSubjectRepo: any;
  let mockLevelRepo: any;
  let mockAuditService: any;
  let mockNotificationService: any;

  const guardianUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'guardian@example.com',
    roles: ['guardian'],
  };

  const studentUser: AuthenticatedUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'student@example.com',
    roles: ['student'],
  };

  const tutorId = '33333333-3333-4333-8333-333333333333';
  const tutorUser: AuthenticatedUser = {
    id: tutorId,
    email: 'tutor@example.com',
    roles: ['tutor'],
  };

  const sampleSubject: SubjectEntity = {
    id: 'subj-math-1',
    code: 'MATH-101',
    nameEn: 'Mathematics',
    nameBn: 'গণিত',
    category: 'academic',
    isActive: true,
  };

  const sampleLevel: EducationLevelEntity = {
    id: 'level-ssc-1',
    code: 'SSC',
    nameEn: 'Secondary (Class 9-10)',
    nameBn: 'মাধ্যমিক (৯ম-১০ম শ্রেণী)',
    sortOrder: 1,
    isActive: true,
  };

  const sampleProfile: Partial<TutorProfileEntity> = {
    userId: tutorId,
    publicationStatus: 'published',
    verificationStatus: 'approved',
    hourlyRateMinor: '60000',
  };

  beforeEach(() => {
    mockBookingRepo = {
      create: vi.fn((data) => ({ id: 'booking-uuid-1', ...data })),
      save: vi.fn(async (entity) => ({ ...entity, id: entity.id || 'booking-uuid-1' })),
      findOne: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    mockTutorProfileRepo = {
      findOne: vi.fn().mockResolvedValue(sampleProfile),
    };

    mockTutorSubjectRepo = {
      findOne: vi.fn().mockResolvedValue(null),
    };

    mockLinkRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
    };

    mockUserRepo = {
      findOne: vi.fn().mockResolvedValue({
        id: guardianUser.id,
        displayName: 'Anwar Guardian',
      }),
    };

    mockSubjectRepo = {
      findOne: vi.fn().mockResolvedValue(sampleSubject),
    };

    mockLevelRepo = {
      findOne: vi.fn().mockResolvedValue(sampleLevel),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      dispatch: vi.fn().mockResolvedValue(undefined),
    };

    service = new BookingsService(
      mockBookingRepo,
      mockTutorProfileRepo,
      mockTutorSubjectRepo,
      mockLinkRepo,
      mockUserRepo,
      mockSubjectRepo,
      mockLevelRepo,
      mockAuditService,
      new GuardianAccessService(mockLinkRepo),
      mockNotificationService,
    );
  });

  describe('createRequest', () => {
    it('should throw BadRequestException if requester requests tutoring from themselves', async () => {
      await expect(
        service.createRequest(tutorUser, {
          tutorId: tutorUser.id,
          studentId: tutorUser.id,
          subjectId: 'subj-math-1',
          educationLevelId: 'level-ssc-1',
          mode: 'online',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if requester record is missing in DB', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createRequest(guardianUser, {
          tutorId,
          studentId: studentUser.id,
          subjectId: 'subj-math-1',
          educationLevelId: 'level-ssc-1',
          mode: 'online',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if requester is not linked to the student', async () => {
      mockLinkRepo.findOne.mockResolvedValueOnce(null); // No active link

      await expect(
        service.createRequest(guardianUser, {
          tutorId,
          studentId: studentUser.id,
          subjectId: 'subj-math-1',
          educationLevelId: 'level-ssc-1',
          mode: 'online',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if tutor profile is not published or approved', async () => {
      mockLinkRepo.findOne.mockResolvedValueOnce({
        guardianUserId: guardianUser.id,
        studentUserId: studentUser.id,
        status: 'active',
      });
      mockTutorProfileRepo.findOne.mockResolvedValueOnce({
        userId: tutorId,
        publicationStatus: 'draft',
        verificationStatus: 'pending',
      });

      await expect(
        service.createRequest(guardianUser, {
          tutorId,
          studentId: studentUser.id,
          subjectId: 'subj-math-1',
          educationLevelId: 'level-ssc-1',
          mode: 'online',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if duplicate active request exists (anti-spam invariant)', async () => {
      mockLinkRepo.findOne.mockResolvedValueOnce({
        guardianUserId: guardianUser.id,
        studentUserId: studentUser.id,
        status: 'active',
      });
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: 'existing-booking',
        status: 'requested',
      });

      await expect(
        service.createRequest(guardianUser, {
          tutorId,
          studentId: studentUser.id,
          subjectId: 'subj-math-1',
          educationLevelId: 'level-ssc-1',
          mode: 'online',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create booking request successfully for linked student and dispatch notification', async () => {
      mockLinkRepo.findOne.mockResolvedValueOnce({
        guardianUserId: guardianUser.id,
        studentUserId: studentUser.id,
        status: 'active',
      });
      mockBookingRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.createRequest(guardianUser, {
        tutorId,
        studentId: studentUser.id,
        subjectId: 'subj-math-1',
        educationLevelId: 'level-ssc-1',
        mode: 'online',
        messageNotes: 'Looking forward to trial class',
        preferredDays: [0, 2],
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('requested');
      expect(result.pricePerSessionMinor).toBe('60000');
      expect(mockBookingRepo.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.request.created',
          actorUserId: guardianUser.id,
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tutorId,
          eventType: 'booking.requested',
        }),
      );
    });

    it('should allow student to request for themselves directly without guardian link check', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: studentUser.id,
        displayName: 'Direct Student',
      });
      mockBookingRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.createRequest(studentUser, {
        tutorId,
        studentId: studentUser.id,
        subjectId: 'subj-math-1',
        educationLevelId: 'level-ssc-1',
        mode: 'in_person',
      });

      expect(result).toBeDefined();
      expect(result.studentUserId).toBe(studentUser.id);
      expect(mockLinkRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getRequestById & Ownership Guard', () => {
    it('should throw NotFoundException if booking does not exist', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.getRequestById('non-existent-id', guardianUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is an unauthorized third party', async () => {
      const thirdPartyUser: AuthenticatedUser = {
        id: '99999999-9999-4999-8999-999999999999',
        email: 'stranger@example.com',
        roles: ['student'],
      };

      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: 'booking-1',
        requesterUserId: guardianUser.id,
        studentUserId: studentUser.id,
        tutorUserId: tutorId,
      });
      mockLinkRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.getRequestById('booking-1', thirdPartyUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return booking if user is requester, student, tutor, or admin', async () => {
      const mockBooking = {
        id: 'booking-1',
        requesterUserId: guardianUser.id,
        studentUserId: studentUser.id,
        tutorUserId: tutorId,
      };
      mockBookingRepo.findOne.mockResolvedValue(mockBooking);

      const resRequester = await service.getRequestById('booking-1', guardianUser);
      expect(resRequester).toEqual(mockBooking);

      const resTutor = await service.getRequestById('booking-1', tutorUser);
      expect(resTutor).toEqual(mockBooking);
    });
  });

  describe('withdrawRequest', () => {
    it('should throw ForbiddenException if user withdrawing is not the requester', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: 'booking-1',
        requesterUserId: guardianUser.id,
        status: 'requested',
      });

      await expect(
        service.withdrawRequest('booking-1', tutorUser, { reason: 'Wrong person' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if booking is not in requested status', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: 'booking-1',
        requesterUserId: guardianUser.id,
        status: 'accepted',
      });

      await expect(service.withdrawRequest('booking-1', guardianUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should mark booking as cancelled, record audit and notify tutor', async () => {
      const booking = {
        id: 'booking-1',
        requesterUserId: guardianUser.id,
        tutorUserId: tutorId,
        status: 'requested' as const,
        serviceAgreementSnapshot: {},
      };
      mockBookingRepo.findOne.mockResolvedValueOnce(booking);

      const res = await service.withdrawRequest('booking-1', guardianUser, {
        reason: 'Schedule change',
      });

      expect(res.status).toBe('cancelled');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.request.withdrawn',
          actorUserId: guardianUser.id,
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tutorId,
          eventType: 'booking.cancelled',
        }),
      );
    });
  });

  describe('respondToRequest', () => {
    it('should throw ForbiddenException if respondent is not the assigned tutor', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: 'booking-1',
        tutorUserId: tutorId,
        status: 'requested',
      });

      await expect(
        service.respondToRequest('booking-1', guardianUser, { action: 'accept' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if booking is already accepted or cancelled', async () => {
      mockBookingRepo.findOne.mockResolvedValueOnce({
        id: 'booking-1',
        tutorUserId: tutorId,
        status: 'cancelled',
      });

      await expect(
        service.respondToRequest('booking-1', tutorUser, { action: 'accept' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept request, update status, audit and notify requester', async () => {
      const booking = {
        id: 'booking-1',
        requesterUserId: guardianUser.id,
        tutorUserId: tutorId,
        status: 'requested' as const,
        subject: { nameEn: 'Mathematics' },
      };
      mockBookingRepo.findOne.mockResolvedValueOnce(booking);
      mockUserRepo.findOne.mockResolvedValueOnce({ displayName: 'Tutor Rahat' });

      const res = await service.respondToRequest('booking-1', tutorUser, { action: 'accept' });

      expect(res.status).toBe('awaiting_payment');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.request.accepted',
          actorUserId: tutorUser.id,
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: guardianUser.id,
          eventType: 'booking.accepted',
        }),
      );
    });

    it('should decline request with reason, audit and notify requester', async () => {
      const booking = {
        id: 'booking-1',
        requesterUserId: guardianUser.id,
        tutorUserId: tutorId,
        status: 'requested' as const,
        subject: { nameEn: 'Mathematics' },
      };
      mockBookingRepo.findOne.mockResolvedValueOnce(booking);
      mockUserRepo.findOne.mockResolvedValueOnce({ displayName: 'Tutor Rahat' });

      const res = await service.respondToRequest('booking-1', tutorUser, {
        action: 'decline',
        reasonNotes: 'Slot is full',
      });

      expect(res.status).toBe('declined');
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.request.declined',
          actorUserId: tutorUser.id,
          reason: 'Slot is full',
        }),
      );
      expect(mockNotificationService.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: guardianUser.id,
          eventType: 'booking.declined',
        }),
      );
    });
  });

  describe('getRequests guardian child scope', () => {
    function mockQueryBuilder() {
      const qb: any = {
        leftJoinAndSelect: vi.fn(() => qb),
        where: vi.fn(() => qb),
        andWhere: vi.fn(() => qb),
        orderBy: vi.fn(() => qb),
        getMany: vi.fn().mockResolvedValue([]),
      };
      mockBookingRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('rejects a studentId that is not an active guardian link (403)', async () => {
      mockLinkRepo.find.mockResolvedValue([{ studentUserId: 'child-linked-1' }]);
      mockQueryBuilder();

      await expect(
        service.getRequests(guardianUser, { studentId: 'child-unlinked-2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('binds the query to the explicitly selected linked child', async () => {
      mockLinkRepo.find.mockResolvedValue([
        { studentUserId: 'child-linked-1' },
        { studentUserId: 'child-linked-2' },
      ]);
      const qb = mockQueryBuilder();

      await service.getRequests(guardianUser, { studentId: 'child-linked-2' });

      expect(qb.where).toHaveBeenCalledWith('booking.studentUserId = :studentId', {
        studentId: 'child-linked-2',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('booking.studentUserId = :studentId', {
        studentId: 'child-linked-2',
      });
    });
  });
});
