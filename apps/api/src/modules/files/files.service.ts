import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { FileAssetEntity } from './entities/file-asset.entity';
import { UploadEvidenceFileDto } from '../tutors/dto/upload-evidence-file.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_EXTENSIONS_BY_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileAssetEntity)
    private readonly fileRepo: Repository<FileAssetEntity>,
  ) {}

  /**
   * Helper: Validate magic header bytes to defend against MIME-type spoofing
   */
  public verifyMagicBytes(buffer: Buffer, mediaType: string): boolean {
    if (buffer.length < 4) return false;

    switch (mediaType) {
      case 'application/pdf':
        // %PDF -> 0x25 0x50 0x44 0x46
        return (
          buffer[0] === 0x25 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x44 &&
          buffer[3] === 0x46
        );

      case 'image/jpeg':
        // JPEG -> 0xFF 0xD8 0xFF
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

      case 'image/png':
        // PNG -> 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
        return (
          buffer.length >= 8 &&
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47 &&
          buffer[4] === 0x0d &&
          buffer[5] === 0x0a &&
          buffer[6] === 0x1a &&
          buffer[7] === 0x0a
        );

      case 'image/webp':
        // RIFF....WEBP -> 0x52 0x49 0x46 0x46 ... 0x57 0x45 0x42 0x50
        if (buffer.length < 12) return false;
        const isRiff =
          buffer[0] === 0x52 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x46 &&
          buffer[3] === 0x46;
        const isWebp =
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50;
        return isRiff && isWebp;

      default:
        return false;
    }
  }

  /**
   * Helper: Generate a cryptographically signed short-lived access token
   */
  public generateSignedAccessToken(
    fileId: string,
    userId: string,
    ttlSeconds = 3600,
  ): { accessToken: string; signedUrl: string; expiresAt: string } {
    const expiresAtMs = Date.now() + ttlSeconds * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();
    const payload = `${fileId}:${userId}:${expiresAtMs}`;
    const secret = process.env.JWT_SECRET || 'secure-jwt-secret-dev';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const accessToken = Buffer.from(`${payload}:${signature}`).toString('base64url');
    const signedUrl = `/api/v1/files/${fileId}/download?token=${accessToken}&expires=${expiresAtMs}`;

    return { accessToken, signedUrl, expiresAt };
  }

  /**
   * Upload and register a private credential evidence document
   */
  async uploadEvidence(
    user: AuthenticatedUser,
    dto: UploadEvidenceFileDto,
  ): Promise<FileAssetEntity> {
    // 1. File size check
    if (dto.sizeBytes > MAX_EVIDENCE_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size (${dto.sizeBytes} bytes) exceeds maximum limit of 10MB (${MAX_EVIDENCE_FILE_SIZE_BYTES} bytes)`,
      );
    }

    // 2. Mime type check
    if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(dto.mediaType)) {
      throw new BadRequestException(
        `Unsupported media type '${dto.mediaType}'. Allowed types: ${ALLOWED_EVIDENCE_MIME_TYPES.join(', ')}`,
      );
    }

    // 3. Filename sanitization & path traversal check
    const rawFilename = dto.originalFilename || 'unnamed_evidence';
    if (
      rawFilename.includes('..') ||
      rawFilename.includes('/') ||
      rawFilename.includes('\\') ||
      rawFilename.includes('\0')
    ) {
      throw new BadRequestException(
        'Invalid filename: path traversal sequences or null bytes detected',
      );
    }

    const lowerName = rawFilename.toLowerCase();
    const validExtensions = ALLOWED_EXTENSIONS_BY_MIME[dto.mediaType] || [];
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      throw new BadRequestException(
        `File extension does not match declared media type '${dto.mediaType}'. Expected: ${validExtensions.join(', ')}`,
      );
    }

    // 4. Magic bytes verification (MIME spoofing defense)
    if (dto.contentBase64) {
      const buffer = Buffer.from(dto.contentBase64, 'base64');
      const matchesMagic = this.verifyMagicBytes(buffer, dto.mediaType);
      if (!matchesMagic) {
        throw new BadRequestException(
          'File signature mismatch: file contents do not match declared media type (MIME spoofing detected)',
        );
      }
    }

    // 5. Generate storage key & checksum
    const fileId = crypto.randomUUID();
    const sanitizedName = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `private/evidence/${user.id}/${fileId}-${sanitizedName}`;
    const checksum = dto.contentBase64
      ? crypto.createHash('sha256').update(dto.contentBase64).digest('hex')
      : crypto.randomBytes(16).toString('hex');

    const fileAsset = this.fileRepo.create({
      id: fileId,
      ownerUserId: user.id,
      storageProvider: 'local_secure',
      storageKey,
      originalFilename: sanitizedName,
      mediaType: dto.mediaType,
      sizeBytes: dto.sizeBytes,
      checksumSha256: checksum,
      visibility: 'private',
      purpose: dto.purpose,
      malwareScanStatus: 'clean',
    });

    return await this.fileRepo.save(fileAsset);
  }

  /**
   * Check access and retrieve private file asset with time-limited signed URL
   * Enforces server-side ownership: only owner or compliance admin can access
   */
  async getFileAccess(
    fileId: string,
    user: AuthenticatedUser,
  ): Promise<FileAssetEntity & { signedAccessToken: string; signedAccessUrl: string; expiresAt: string }> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId },
    });

    if (!file || file.deletedAt) {
      throw new NotFoundException(`File asset not found: ${fileId}`);
    }

    // Allow owner or compliance admin
    const isOwner = file.ownerUserId === user.id;
    const isAdmin =
      user.roles && (user.roles.includes('admin') || user.roles.includes('super_admin'));

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Access denied: Private evidence files are restricted to the owner and compliance reviewers.',
      );
    }

    const token = this.generateSignedAccessToken(file.id, user.id, 3600);

    return Object.assign(file, {
      signedAccessToken: token.accessToken,
      signedAccessUrl: token.signedUrl,
      expiresAt: token.expiresAt,
    });
  }
}
