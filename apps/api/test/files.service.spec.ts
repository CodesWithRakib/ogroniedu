import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilesService } from '../src/modules/files/files.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileAssetEntity } from '../src/modules/files/entities/file-asset.entity';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

describe('FilesService Unit & Ownership Tests', () => {
  let service: FilesService;
  let mockFileRepo: any;

  const ownerUser: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'tutor@example.com',
    roles: ['tutor'],
  };

  const adminUser: AuthenticatedUser = {
    id: '88888888-8888-4888-8888-888888888888',
    email: 'admin@example.com',
    roles: ['admin'],
  };

  const unrelatedUser: AuthenticatedUser = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'intruder@example.com',
    roles: ['student'],
  };

  beforeEach(() => {
    mockFileRepo = {
      create: vi.fn((dto) => ({ ...dto, id: 'file-123' })),
      save: vi.fn(async (entity) => ({ ...entity, createdAt: new Date() })),
      findOne: vi.fn(),
    };

    service = new FilesService(mockFileRepo);
  });

  describe('Evidence File Uploads & Limits', () => {
    it('should successfully upload valid PDF evidence document within size limits', async () => {
      const file = await service.uploadEvidence(ownerUser, {
        purpose: 'nid',
        originalFilename: 'nid_front_back.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 2 * 1024 * 1024, // 2MB
        contentBase64: 'JVBERi0xLjQK...',
      });

      expect(file).toBeDefined();
      expect(file.id).toBe('file-123');
      expect(file.visibility).toBe('private');
      expect(file.ownerUserId).toBe(ownerUser.id);
      expect(mockFileRepo.save).toHaveBeenCalled();
    });

    it('NEGATIVE TEST: should reject upload if size exceeds 10MB limit', async () => {
      await expect(
        service.uploadEvidence(ownerUser, {
          purpose: 'nid',
          originalFilename: 'huge_document.pdf',
          mediaType: 'application/pdf',
          sizeBytes: 15 * 1024 * 1024, // 15MB > 10MB limit
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('NEGATIVE TEST: should reject upload if mediaType is not an approved document/image format', async () => {
      await expect(
        service.uploadEvidence(ownerUser, {
          purpose: 'academic_certificate',
          originalFilename: 'script.exe',
          mediaType: 'application/x-msdownload', // Disallowed type
          sizeBytes: 1024,
        }),
      ).rejects.toThrow(/Unsupported media type/i);
    });
  });

  describe('File Access & Server-side Ownership Guard', () => {
    const fileRecord: Partial<FileAssetEntity> = {
      id: 'file-123',
      ownerUserId: ownerUser.id,
      originalFilename: 'nid.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 2048,
      visibility: 'private',
      storageProvider: 'local_secure',
      createdAt: new Date(),
    };

    it('should allow the owner to access their own private evidence file', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce(fileRecord);

      const result = await service.getFileAccess('file-123', ownerUser);
      expect(result.id).toBe('file-123');
      expect(result.ownerUserId).toBe(ownerUser.id);
    });

    it('should allow compliance admin to inspect private evidence file for review', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce(fileRecord);

      const result = await service.getFileAccess('file-123', adminUser);
      expect(result.id).toBe('file-123');
    });

    it('NEGATIVE TEST: should reject unrelated user attempting to inspect private evidence file', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce(fileRecord);

      await expect(service.getFileAccess('file-123', unrelatedUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('NEGATIVE TEST: should throw 404 if file does not exist', async () => {
      mockFileRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.getFileAccess('file-999', ownerUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('HMAC Token Verification for Downloads (SEC-001)', () => {
    const fileRecord: Partial<FileAssetEntity> = {
      id: 'file-123',
      ownerUserId: ownerUser.id,
      originalFilename: 'nid.pdf',
      mediaType: 'application/pdf',
      sizeBytes: 2048,
      visibility: 'private',
      storageProvider: 'local_secure',
      createdAt: new Date(),
    };

    it('should grant download access using a valid HMAC-signed access token', async () => {
      mockFileRepo.findOne.mockResolvedValue(fileRecord);

      const tokenObj = service.generateSignedAccessToken('file-123', ownerUser.id, 3600);
      const result = await service.verifyDownloadAccess('file-123', tokenObj.accessToken);

      expect(result.file.id).toBe('file-123');
      expect(result.isDirectTokenAccess).toBe(true);
    });

    it('NEGATIVE TEST: should reject expired HMAC download token', async () => {
      mockFileRepo.findOne.mockResolvedValue(fileRecord);

      // Token generated with negative TTL (already expired)
      const tokenObj = service.generateSignedAccessToken('file-123', ownerUser.id, -10);
      await expect(
        service.verifyDownloadAccess('file-123', tokenObj.accessToken),
      ).rejects.toThrow(/expired/i);
    });

    it('NEGATIVE TEST: should reject tampered HMAC signature', async () => {
      mockFileRepo.findOne.mockResolvedValue(fileRecord);

      const tokenObj = service.generateSignedAccessToken('file-123', ownerUser.id, 3600);
      const decoded = Buffer.from(tokenObj.accessToken, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      parts[3] = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const tamperedToken = Buffer.from(parts.join(':')).toString('base64url');

      await expect(
        service.verifyDownloadAccess('file-123', tamperedToken),
      ).rejects.toThrow(/signature/i);
    });

    it('NEGATIVE TEST: should reject token for mismatched fileId', async () => {
      mockFileRepo.findOne.mockResolvedValue(fileRecord);

      const tokenObj = service.generateSignedAccessToken('other-file-999', ownerUser.id, 3600);
      await expect(
        service.verifyDownloadAccess('file-123', tokenObj.accessToken),
      ).rejects.toThrow(/mismatch/i);
    });

    it('should allow authenticated owner to download directly without token', async () => {
      mockFileRepo.findOne.mockResolvedValue(fileRecord);

      const result = await service.verifyDownloadAccess('file-123', undefined, ownerUser);
      expect(result.file.id).toBe('file-123');
      expect(result.isDirectTokenAccess).toBe(false);
    });

    it('should allow authenticated admin to download directly without token', async () => {
      mockFileRepo.findOne.mockResolvedValue(fileRecord);

      const result = await service.verifyDownloadAccess('file-123', undefined, adminUser);
      expect(result.file.id).toBe('file-123');
      expect(result.isDirectTokenAccess).toBe(false);
    });

    it('NEGATIVE TEST: should reject unauthenticated request without token', async () => {
      mockFileRepo.findOne.mockResolvedValue(fileRecord);

      await expect(service.verifyDownloadAccess('file-123', undefined, undefined)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('NEGATIVE TEST: should reject unauthorized non-owner without token', async () => {
      mockFileRepo.findOne.mockResolvedValue(fileRecord);

      await expect(service.verifyDownloadAccess('file-123', undefined, unrelatedUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
