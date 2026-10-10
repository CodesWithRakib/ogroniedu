import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from '../src/modules/users/users.service';
import { NotFoundException } from '@nestjs/common';
import { UserEntity } from '../src/modules/auth/entities/user.entity';
import { StudentProfileEntity } from '../src/modules/users/entities/student-profile.entity';
import { AuthSessionEntity } from '../src/modules/auth/entities/auth-session.entity';
import { GuardianStudentLinkEntity } from '../src/modules/guardians/entities/guardian-student-link.entity';
import { AuditService } from '../src/modules/audit/audit.service';

describe('UsersService Unit Tests', () => {
  let service: UsersService;
  let mockUserRepo: any;
  let mockStudentProfileRepo: any;
  let mockSessionRepo: any;
  let mockGuardianLinkRepo: any;
  let mockAuditService: any;
  let mockDataSource: any;

  const testUser: UserEntity = {
    id: 'user-uuid-1',
    displayName: 'Md. Rakib Islam',
    email: 'rakib@example.com',
    phoneE164: '+8801700000000',
    passwordHash: 'hash',
    preferredLocale: 'bn',
    status: 'active',
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockUserRepo = {
      findOne: vi.fn(),
      save: vi.fn((u) => Promise.resolve(u)),
    };

    mockStudentProfileRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => data),
      save: vi.fn((data) => Promise.resolve(data)),
    };

    mockSessionRepo = {
      find: vi.fn(),
      update: vi.fn().mockResolvedValue({ affected: 2 }),
    };

    mockGuardianLinkRepo = {
      find: vi.fn(),
    };

    mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      getUserAuditHistory: vi.fn().mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]),
    };

    mockDataSource = {
      query: vi.fn().mockResolvedValue([{ code: 'student' }]),
    };

    service = new UsersService(
      mockUserRepo,
      mockStudentProfileRepo,
      mockSessionRepo,
      mockGuardianLinkRepo,
      mockAuditService,
      mockDataSource,
    );
  });

  describe('User Profile & Minor Age Calculations', () => {
    it('should correctly calculate minor status for age < 18', () => {
      // 14 years old
      const dob14 = new Date();
      dob14.setFullYear(dob14.getFullYear() - 14);
      expect(service.isMinor(dob14.toISOString().split('T')[0])).toBe(true);

      // 20 years old
      const dob20 = new Date();
      dob20.setFullYear(dob20.getFullYear() - 20);
      expect(service.isMinor(dob20.toISOString().split('T')[0])).toBe(false);
    });

    it('should retrieve profile with student profile and computed minor status', async () => {
      mockUserRepo.findOne.mockResolvedValue(testUser);
      mockStudentProfileRepo.findOne.mockResolvedValue({
        userId: testUser.id,
        dateOfBirth: '2010-06-15',
        institutionName: 'Rajuk Uttara Model College',
        profileVisibility: 'private',
      });

      const profile = await service.getProfile(testUser.id);
      expect(profile.id).toBe(testUser.id);
      expect(profile.displayName).toBe(testUser.displayName);
      expect(profile.isMinor).toBe(true);
      expect(profile.studentProfile?.institutionName).toBe('Rajuk Uttara Model College');
    });

    it('NEGATIVE TEST: should throw NotFoundException when user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Profile Updates', () => {
    it('should update display name and preferred locale', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...testUser });

      const updated = await service.updateProfile(testUser.id, {
        displayName: 'Rakib Islam Updated',
        preferredLocale: 'en',
      });

      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.profile.updated',
          actorUserId: testUser.id,
        }),
      );
    });

    it('should upsert student profile academic parameters', async () => {
      mockUserRepo.findOne.mockResolvedValue(testUser);
      mockStudentProfileRepo.findOne.mockResolvedValue(null);

      const saved = await service.upsertStudentProfile(testUser.id, {
        dateOfBirth: '2008-01-10',
        institutionName: 'St. Joseph Higher Secondary School',
        stream: 'science',
        learningGoals: 'Master HSC Physics and Higher Math',
        profileVisibility: 'limited',
      });

      expect(saved.institutionName).toBe('St. Joseph Higher Secondary School');
      expect(mockStudentProfileRepo.save).toHaveBeenCalled();
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'student.profile.updated',
          resourceType: 'student_profile',
        }),
      );
    });
  });

  describe('Privacy, Data Export & Account Deletion', () => {
    it('should export all user data including sessions and family relationships', async () => {
      mockUserRepo.findOne.mockResolvedValue(testUser);
      mockStudentProfileRepo.findOne.mockResolvedValue({
        userId: testUser.id,
        institutionName: 'BUET',
      });
      mockSessionRepo.find.mockResolvedValue([
        {
          id: 'sess-1',
          createdAt: new Date(),
          userAgent: 'Mozilla/5.0',
        },
      ]);
      mockGuardianLinkRepo.find.mockResolvedValue([
        {
          id: 'link-1',
          guardianUserId: 'g-id',
          relationshipType: 'father',
          status: 'active',
        },
      ]);

      const exported = await service.exportUserData(testUser.id);
      expect(exported.user).toBeDefined();
      expect(exported.studentProfile).toBeDefined();
      expect((exported.activeSessions as any[]).length).toBe(1);
      expect((exported.familyLinks as any[]).length).toBe(1);
      expect(exported.auditHistoryCount).toBe(2);
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.data.exported',
        }),
      );
    });

    it('should set status to deletion_pending and revoke active sessions on account deletion', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...testUser });

      const result = await service.deleteAccount(testUser.id, 'Moving abroad');
      expect(result.success).toBe(true);
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'deletion_pending',
        }),
      );
      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: testUser.id }),
        expect.objectContaining({ revokeReason: 'account_deletion_requested' }),
      );
      expect(mockAuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.account.deletion_requested',
          reason: 'Moving abroad',
        }),
      );
    });
  });
});
