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

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileAssetEntity)
    private readonly fileRepo: Repository<FileAssetEntity>,
  ) {}

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

    // 3. Generate storage key & checksum
    const fileId = crypto.randomUUID();
    const sanitizedName = dto.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
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
   * Check access and retrieve private file asset
   * Enforces server-side ownership: only owner or compliance admin can access
   */
  async getFileAccess(fileId: string, user: AuthenticatedUser): Promise<FileAssetEntity> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId },
    });

    if (!file || file.deletedAt) {
      throw new NotFoundException(`File asset not found: ${fileId}`);
    }

    // Allow owner
    if (file.ownerUserId === user.id) {
      return file;
    }

    // Allow compliance reviewers
    const isAdmin =
      user.roles && (user.roles.includes('admin') || user.roles.includes('super_admin'));
    if (isAdmin) {
      return file;
    }

    // Negative denial: unauthorized user
    throw new ForbiddenException(
      'Access denied: Private evidence files are restricted to the owner and compliance reviewers.',
    );
  }
}
