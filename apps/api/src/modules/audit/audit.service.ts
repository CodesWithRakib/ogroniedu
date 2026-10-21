import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import type { RecordAuditParams } from './interfaces/record-audit-params.interface';

export type { RecordAuditParams } from './interfaces/record-audit-params.interface';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
  ) {}

  async record(params: RecordAuditParams): Promise<AuditLogEntity> {
    try {
      const entry = this.auditRepository.create({
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        organizationId: params.organizationId ?? null,
        requestId: params.requestId ?? null,
        reason: params.reason ?? null,
        safeMetadata: params.safeMetadata ?? {},
      });

      return await this.auditRepository.save(entry);
    } catch (error) {
      this.logger.error(
        `Failed to record audit log for action ${params.action} on ${params.resourceType}:${params.resourceId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Fallback object so business transactions are not interrupted if audit write fails
      const fallback = new AuditLogEntity();
      fallback.action = params.action;
      fallback.resourceType = params.resourceType;
      fallback.actorUserId = params.actorUserId ?? null;
      fallback.createdAt = new Date();
      return fallback;
    }
  }

  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    limit = 50,
  ): Promise<AuditLogEntity[]> {
    return this.auditRepository.find({
      where: { resourceType, resourceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUserAuditHistory(actorUserId: string, limit = 50): Promise<AuditLogEntity[]> {
    return this.auditRepository.find({
      where: { actorUserId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getOrganizationAuditHistory(
    organizationId: string,
    limit = 50,
  ): Promise<AuditLogEntity[]> {
    return this.auditRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
