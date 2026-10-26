import type {
  LearningMaterialView,
  MaterialDownload,
} from '../interfaces/learning-materials.interfaces';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LearningMaterialEntity } from '../entities/learning-material.entity';
import { LessonPlanEntity } from '../entities/lesson-plan.entity';
import { AssignmentEntity } from '../entities/assignment.entity';
import { BookingSessionEntity } from '../../bookings/entities/booking-session.entity';
import { FileAssetEntity } from '../../files/entities/file-asset.entity';
import { FilesService } from '../../files/files.service';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { LearningAccessService } from './learning-access.service';
import {
  CreateLinkMaterialDto,
  LearningListQueryDto,
  UpdateLearningMaterialDto,
  UploadLearningMaterialDto,
} from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { toPageSize } from '../../../common/pagination';
import {
  ALLOWED_LEARNING_EXTENSIONS_BY_MIME,
  ALLOWED_LEARNING_MIME_TYPES,
  DEFAULT_LEARNING_UPLOAD_DIR,
  LEARNING_STORAGE_PROVIDER,
  LEARNING_UPLOAD_DIR_ENV,
  MAX_LEARNING_FILE_SIZE_BYTES,
} from '../constants/learning-file.constants';

export type {
  LearningMaterialView,
  MaterialDownload,
} from '../interfaces/learning-materials.interfaces';

/**
 * Lesson resources. Files are written under a configurable private directory,
 * registered in `file_assets`, and streamed only through this service after the
 * viewer's relationship to the booking (and publication state) is verified.
 *
 * No malware scanner is integrated; learning files are stored with
 * `malware_scan_status='not_required'` rather than claiming a scan.
 */
@Injectable()
export class LearningMaterialsService {
  private readonly logger = new Logger(LearningMaterialsService.name);

  constructor(
    @InjectRepository(LearningMaterialEntity)
    private readonly materialRepo: Repository<LearningMaterialEntity>,
    @InjectRepository(LessonPlanEntity)
    private readonly planRepo: Repository<LessonPlanEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepo: Repository<AssignmentEntity>,
    @InjectRepository(BookingSessionEntity)
    private readonly sessionRepo: Repository<BookingSessionEntity>,
    @InjectRepository(FileAssetEntity)
    private readonly fileRepo: Repository<FileAssetEntity>,
    @Inject(FilesService)
    private readonly filesService: FilesService,
    @Inject(forwardRef(() => LearningAccessService))
    private readonly access: LearningAccessService,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Optional()
    @Inject(NotificationService)
    private readonly notificationService?: NotificationService,
  ) {}

  getUploadRoot(): string {
    return path.resolve(process.env[LEARNING_UPLOAD_DIR_ENV] || DEFAULT_LEARNING_UPLOAD_DIR);
  }

  async uploadFile(
    user: AuthenticatedUser,
    dto: UploadLearningMaterialDto,
    requestId?: string,
  ): Promise<LearningMaterialView> {
    const booking = await this.access.loadBookingOrFail(dto.bookingId);
    this.access.assertCanAuthorLearning(user, booking);
    await this.assertTargetsBelongToBooking(booking.id, dto);

    const buffer = Buffer.from(dto.contentBase64, 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }
    if (buffer.length > MAX_LEARNING_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size (${buffer.length} bytes) exceeds the maximum of ${MAX_LEARNING_FILE_SIZE_BYTES} bytes`,
      );
    }
    if (!ALLOWED_LEARNING_MIME_TYPES.includes(dto.mediaType)) {
      throw new BadRequestException(
        `Unsupported media type '${dto.mediaType}'. Allowed: ${ALLOWED_LEARNING_MIME_TYPES.join(', ')}`,
      );
    }

    const sanitized = this.sanitizeFilename(dto.originalFilename);
    const allowedExtensions = ALLOWED_LEARNING_EXTENSIONS_BY_MIME[dto.mediaType] ?? [];
    if (!allowedExtensions.some((ext) => sanitized.toLowerCase().endsWith(ext))) {
      throw new BadRequestException(
        `File extension does not match declared media type '${dto.mediaType}'`,
      );
    }
    if (!this.filesService.verifyMagicBytes(buffer, dto.mediaType)) {
      throw new BadRequestException(
        'File signature mismatch: contents do not match the declared media type',
      );
    }

    const stored = await this.writePrivateFile(buffer, sanitized);
    let fileAsset: FileAssetEntity | null = null;
    try {
      fileAsset = await this.fileRepo.save(
        this.fileRepo.create({
          id: randomUUID(),
          ownerUserId: user.id,
          storageProvider: LEARNING_STORAGE_PROVIDER,
          storageKey: stored.storageKey,
          originalFilename: sanitized,
          mediaType: dto.mediaType,
          sizeBytes: buffer.length,
          checksumSha256: createHash('sha256').update(buffer).digest('hex'),
          visibility: 'private',
          purpose: 'learning_material',
          malwareScanStatus: 'not_required',
        }),
      );

      const now = new Date();
      const publish = Boolean(dto.publishNow);
      const material = await this.materialRepo.save(
        this.materialRepo.create({
          bookingId: booking.id,
          lessonPlanId: dto.lessonPlanId ?? null,
          sessionId: dto.sessionId ?? null,
          assignmentId: dto.assignmentId ?? null,
          uploadedByUserId: user.id,
          kind: 'file',
          fileAssetId: fileAsset.id,
          externalUrl: null,
          title: dto.title.trim(),
          description: dto.description ?? null,
          status: publish ? 'published' : 'draft',
          publishedAt: publish ? now : null,
        }),
      );

      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.material_uploaded',
        resourceType: 'learning_materials',
        resourceId: material.id,
        requestId,
        safeMetadata: {
          bookingId: booking.id,
          mediaType: dto.mediaType,
          sizeBytes: buffer.length,
          lessonPlanId: dto.lessonPlanId ?? null,
          sessionId: dto.sessionId ?? null,
          assignmentId: dto.assignmentId ?? null,
        },
      });

      if (publish) await this.notifyPublished(material, booking.studentUserId);
      return this.toView(material, fileAsset);
    } catch (err) {
      // Do not leave an orphaned file or file_asset row when registration fails.
      await unlink(stored.absolutePath).catch(() => undefined);
      if (fileAsset) {
        await this.fileRepo.delete({ id: fileAsset.id }).catch(() => undefined);
      }
      throw err;
    }
  }

  async createLink(
    user: AuthenticatedUser,
    dto: CreateLinkMaterialDto,
    requestId?: string,
  ): Promise<LearningMaterialView> {
    const booking = await this.access.loadBookingOrFail(dto.bookingId);
    this.access.assertCanAuthorLearning(user, booking);
    await this.assertTargetsBelongToBooking(booking.id, dto);

    if (!/^https:\/\//i.test(dto.externalUrl)) {
      throw new BadRequestException('Only https:// links are accepted');
    }

    const now = new Date();
    const publish = Boolean(dto.publishNow);
    const material = await this.materialRepo.save(
      this.materialRepo.create({
        bookingId: booking.id,
        lessonPlanId: dto.lessonPlanId ?? null,
        sessionId: dto.sessionId ?? null,
        assignmentId: dto.assignmentId ?? null,
        uploadedByUserId: user.id,
        kind: 'link',
        fileAssetId: null,
        externalUrl: dto.externalUrl,
        title: dto.title.trim(),
        description: dto.description ?? null,
        status: publish ? 'published' : 'draft',
        publishedAt: publish ? now : null,
      }),
    );

    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.material_linked',
      resourceType: 'learning_materials',
      resourceId: material.id,
      requestId,
      safeMetadata: { bookingId: booking.id, host: this.safeHost(dto.externalUrl) },
    });

    if (publish) await this.notifyPublished(material, booking.studentUserId);
    return this.toView(material, null);
  }

  async updateMaterial(
    user: AuthenticatedUser,
    materialId: string,
    dto: UpdateLearningMaterialDto,
    requestId?: string,
  ): Promise<LearningMaterialView> {
    const material = await this.getMaterialOrFail(materialId);
    const booking = await this.access.loadBookingOrFail(material.bookingId);
    this.access.assertCanAuthorLearning(user, booking);
    if (material.status === 'archived') {
      throw new BadRequestException('Archived materials cannot be edited');
    }
    if (dto.title !== undefined) material.title = dto.title.trim();
    if (dto.description !== undefined) material.description = dto.description;
    const saved = await this.materialRepo.save(material);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.material_updated',
      resourceType: 'learning_materials',
      resourceId: saved.id,
      requestId,
      safeMetadata: { bookingId: saved.bookingId },
    });
    return this.toView(saved, await this.findFileAsset(saved.fileAssetId));
  }

  async publishMaterial(
    user: AuthenticatedUser,
    materialId: string,
    requestId?: string,
  ): Promise<LearningMaterialView> {
    const material = await this.getMaterialOrFail(materialId);
    const booking = await this.access.loadBookingOrFail(material.bookingId);
    this.access.assertCanAuthorLearning(user, booking);
    if (material.status === 'archived') {
      throw new BadRequestException('Archived materials cannot be published');
    }

    let changed = false;
    if (material.status !== 'published') {
      material.status = 'published';
      material.publishedAt = material.publishedAt ?? new Date();
      await this.materialRepo.save(material);
      changed = true;
      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.material_published',
        resourceType: 'learning_materials',
        resourceId: material.id,
        requestId,
        safeMetadata: { bookingId: material.bookingId },
      });
    }
    if (changed) await this.notifyPublished(material, booking.studentUserId);
    return this.toView(material, await this.findFileAsset(material.fileAssetId));
  }

  async archiveMaterial(
    user: AuthenticatedUser,
    materialId: string,
    requestId?: string,
  ): Promise<LearningMaterialView> {
    const material = await this.getMaterialOrFail(materialId);
    const booking = await this.access.loadBookingOrFail(material.bookingId);
    this.access.assertCanAuthorLearning(user, booking);

    if (material.status !== 'archived') {
      material.status = 'archived';
      await this.materialRepo.save(material);
      await this.auditService.record({
        actorUserId: user.id,
        action: 'learning.material_archived',
        resourceType: 'learning_materials',
        resourceId: material.id,
        requestId,
        safeMetadata: { bookingId: material.bookingId },
      });
    }
    return this.toView(material, await this.findFileAsset(material.fileAssetId));
  }

  /** All materials visible to the caller for one booking (drafts only for owners). */
  async listBookingMaterials(
    user: AuthenticatedUser,
    bookingId: string,
    query: LearningListQueryDto,
  ): Promise<{
    items: LearningMaterialView[];
    totalItems: number;
    page: number;
    pageSize: number;
  }> {
    const booking = await this.access.loadBookingOrFail(bookingId);
    const canSeeDrafts = this.access.isLearningOwner(user, booking);
    if (!canSeeDrafts) {
      await this.access.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);
    }

    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = toPageSize(query.pageSize);
    const qb = this.materialRepo
      .createQueryBuilder('material')
      .leftJoinAndSelect('material.fileAsset', 'fileAsset')
      .where('material.bookingId = :bookingId', { bookingId })
      .orderBy('material.createdAt', 'DESC')
      .addOrderBy('material.id', 'DESC');

    if (!canSeeDrafts) qb.andWhere("material.status = 'published'");
    if (query.sessionId)
      qb.andWhere('material.sessionId = :sessionId', { sessionId: query.sessionId });
    if (query.status) qb.andWhere('material.status = :status', { status: query.status });

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return {
      items: rows.map((row) => this.toView(row, row.fileAsset ?? null)),
      totalItems: total,
      page,
      pageSize,
    };
  }

  async listSessionMaterials(
    user: AuthenticatedUser,
    sessionId: string,
  ): Promise<LearningMaterialView[]> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    const booking = await this.access.loadBookingOrFail(session.bookingId);
    const canSeeDrafts = this.access.isLearningOwner(user, booking);
    if (!canSeeDrafts) {
      await this.access.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);
    }

    const rows = await this.materialRepo.find({
      where: {
        sessionId,
        ...(canSeeDrafts ? {} : { status: 'published' as const }),
      },
      relations: { fileAsset: true },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    return rows.map((row) => this.toView(row, row.fileAsset ?? null));
  }

  /**
   * Authorized byte stream. The caller's link to the booking and the material's
   * publication state are checked before the filesystem is touched.
   */
  async downloadMaterial(user: AuthenticatedUser, materialId: string): Promise<MaterialDownload> {
    const material = await this.getMaterialOrFail(materialId);
    const booking = await this.access.loadBookingOrFail(material.bookingId);
    const isOwner = this.access.isLearningOwner(user, booking);

    if (!isOwner) {
      if (material.status !== 'published') {
        throw new NotFoundException(`Material ${materialId} not found`);
      }
      await this.access.assertCanAccessStudentRecords(user, booking.studentUserId, booking.id);
      if (material.assignmentId) {
        const assignment = await this.assignmentRepo.findOne({
          where: { id: material.assignmentId },
        });
        if (!assignment || assignment.status !== 'published') {
          throw new NotFoundException(`Material ${materialId} not found`);
        }
      }
    }

    if (material.kind !== 'file' || !material.fileAssetId) {
      throw new BadRequestException('This material is an external link, not a downloadable file');
    }
    const asset = await this.fileRepo.findOne({ where: { id: material.fileAssetId } });
    if (!asset || asset.deletedAt || asset.visibility !== 'private') {
      throw new NotFoundException('Associated file is unavailable');
    }

    const absolute = this.resolveStoragePath(asset.storageKey);
    let buffer: Buffer;
    try {
      buffer = await readFile(absolute);
    } catch (err) {
      this.logger.warn(`Learning file missing for asset ${asset.id}: ${String(err)}`);
      throw new NotFoundException('Associated file is unavailable');
    }

    await this.auditService.record({
      actorUserId: user.id,
      action: 'learning.material_downloaded',
      resourceType: 'learning_materials',
      resourceId: material.id,
      safeMetadata: { bookingId: material.bookingId, assetId: asset.id },
    });

    return {
      buffer,
      filename: asset.originalFilename || 'learning-material',
      mediaType: asset.mediaType,
    };
  }

  /** Used by the assignment service to expose tutor attachments on a submission review. */
  async listAssignmentMaterials(assignmentId: string): Promise<LearningMaterialView[]> {
    const rows = await this.materialRepo.find({
      where: { assignmentId },
      relations: { fileAsset: true },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    return rows.map((row) => this.toView(row, row.fileAsset ?? null));
  }

  async assertParticipantFileAssets(studentUserId: string, assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) return;
    const assets = await this.fileRepo.find({ where: { id: In(assetIds) } });
    const found = new Set(assets.map((asset) => asset.id));
    const missing = assetIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(`Unknown attachment asset(s): ${missing.join(', ')}`);
    }
    for (const asset of assets) {
      if (asset.ownerUserId !== studentUserId) {
        throw new ForbiddenException('Attachments must be files you uploaded yourself');
      }
      if (asset.deletedAt) {
        throw new BadRequestException('One or more attachments are no longer available');
      }
      if (!['assignment_submission', 'learning_material'].includes(asset.purpose)) {
        throw new BadRequestException('Attachment purpose is not valid for homework');
      }
    }
  }

  private async assertTargetsBelongToBooking(
    bookingId: string,
    dto: { lessonPlanId?: string; sessionId?: string; assignmentId?: string },
  ): Promise<void> {
    if (dto.lessonPlanId) {
      const plan = await this.planRepo.findOne({ where: { id: dto.lessonPlanId } });
      if (!plan || plan.bookingId !== bookingId) {
        throw new BadRequestException('Provided lessonPlanId does not belong to this booking');
      }
    }
    if (dto.sessionId) {
      const session = await this.sessionRepo.findOne({ where: { id: dto.sessionId } });
      if (!session || session.bookingId !== bookingId) {
        throw new BadRequestException('Provided sessionId does not belong to this booking');
      }
    }
    if (dto.assignmentId) {
      const assignment = await this.assignmentRepo.findOne({ where: { id: dto.assignmentId } });
      if (!assignment || assignment.bookingId !== bookingId) {
        throw new BadRequestException('Provided assignmentId does not belong to this booking');
      }
    }
  }

  private sanitizeFilename(raw: string): string {
    if (raw.includes('..') || raw.includes('/') || raw.includes('\\') || raw.includes('\0')) {
      throw new BadRequestException('Invalid filename: path traversal sequences are not allowed');
    }
    const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    if (!cleaned || cleaned.startsWith('.')) {
      throw new BadRequestException('Invalid filename');
    }
    return cleaned;
  }

  private async writePrivateFile(
    buffer: Buffer,
    sanitizedFilename: string,
  ): Promise<{ storageKey: string; absolutePath: string }> {
    const now = new Date();
    const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const storageKey = path.posix.join(folder, `${randomUUID()}-${sanitizedFilename}`);
    const absolutePath = this.resolveStoragePath(storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer, { flag: 'wx' });
    return { storageKey, absolutePath };
  }

  private resolveStoragePath(storageKey: string): string {
    const root = this.getUploadRoot();
    const absolute = path.resolve(root, storageKey);
    if (absolute !== root && !absolute.startsWith(root + path.sep)) {
      throw new BadRequestException('Invalid storage key');
    }
    return absolute;
  }

  private async findFileAsset(fileAssetId: string | null): Promise<FileAssetEntity | null> {
    if (!fileAssetId) return null;
    return this.fileRepo.findOne({ where: { id: fileAssetId } });
  }

  private async getMaterialOrFail(materialId: string): Promise<LearningMaterialEntity> {
    const material = await this.materialRepo.findOne({ where: { id: materialId } });
    if (!material) throw new NotFoundException(`Material ${materialId} not found`);
    return material;
  }

  private async notifyPublished(
    material: LearningMaterialEntity,
    studentUserId: string,
  ): Promise<void> {
    if (!this.notificationService) return;
    const guardianIds = await this.guardianAccess.findActiveGuardianIds(studentUserId);
    const payload = {
      materialId: material.id,
      materialTitle: material.title,
      sessionId: material.sessionId ?? '',
      bookingId: material.bookingId,
    };
    for (const guardianId of guardianIds) {
      await this.notificationService
        .dispatch({
          userId: guardianId,
          recipientRole: 'guardian',
          eventType: 'learning_material.published',
          payload,
        })
        .catch((err) => this.logger.warn(`Guardian material notification failed: ${String(err)}`));
    }
    await this.notificationService
      .dispatch({
        userId: studentUserId,
        recipientRole: 'student',
        eventType: 'learning_material.published',
        payload,
      })
      .catch((err) => this.logger.warn(`Student material notification failed: ${String(err)}`));
  }

  private toView(
    material: LearningMaterialEntity,
    fileAsset: FileAssetEntity | null,
  ): LearningMaterialView {
    return {
      id: material.id,
      bookingId: material.bookingId,
      lessonPlanId: material.lessonPlanId,
      sessionId: material.sessionId,
      assignmentId: material.assignmentId,
      kind: material.kind,
      title: material.title,
      description: material.description,
      status: material.status,
      externalUrl: material.externalUrl,
      fileName: fileAsset?.originalFilename ?? null,
      mediaType: fileAsset?.mediaType ?? null,
      sizeBytes:
        fileAsset?.sizeBytes !== undefined && fileAsset?.sizeBytes !== null
          ? String(fileAsset.sizeBytes)
          : null,
      publishedAt: material.publishedAt ? new Date(material.publishedAt).toISOString() : null,
      createdAt: new Date(material.createdAt).toISOString(),
      downloadUrl:
        material.kind === 'file' ? `/api/v1/learning/materials/${material.id}/download` : null,
    };
  }

  private safeHost(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return 'invalid-url';
    }
  }
}
