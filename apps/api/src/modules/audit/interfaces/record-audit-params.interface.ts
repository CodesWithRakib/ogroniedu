export interface RecordAuditParams {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string | null;
  reason?: string | null;
  safeMetadata?: Record<string, unknown>;
}
