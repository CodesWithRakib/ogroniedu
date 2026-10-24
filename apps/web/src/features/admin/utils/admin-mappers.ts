import type {
  AdminAuditLogItem,
  AdminBookingItem,
  AdminSupportTicketItem,
  AdminUserItem,
  PendingTutorItem,
  TutorDossierQualification,
  TutorReviewHistoryEntry,
} from '../types/admin.types';

type UnknownRecord = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

/** Map untyped admin API rows to display items. Single home for admin field mapping. */
export function mapAdminUsers(rows: unknown[]): AdminUserItem[] {
  return (rows as UnknownRecord[]).map((u) => ({
    id: String(u.id),
    displayName: str(u.displayName ?? u.email ?? u.id, String(u.id)),
    email: strOrNull(u.email),
    phoneE164: strOrNull(u.phoneE164 ?? u.phone),
    status: (u.status as AdminUserItem['status']) ?? 'active',
    roles: Array.isArray(u.roles) ? (u.roles as string[]) : [],
    createdAt: str(u.createdAt, new Date().toISOString()),
  }));
}

export function mapAdminBookings(rows: unknown[]): AdminBookingItem[] {
  return (rows as UnknownRecord[]).map((b) => {
    const studentUser = b.studentUser as UnknownRecord | undefined;
    const requesterUser = b.requesterUser as UnknownRecord | undefined;
    const student = studentUser ?? requesterUser;
    const studentName = str(
      student?.displayName ?? student?.fullName ?? student?.email ?? b.studentName ?? b.studentId,
      '—',
    );

    const tutorProfile = b.tutorProfile as UnknownRecord | undefined;
    const tutorUser = (tutorProfile?.user ?? b.tutorUser) as UnknownRecord | undefined;
    const tutorName = str(
      tutorUser?.displayName ?? tutorUser?.fullName ?? tutorUser?.email ?? b.tutorName ?? b.tutorId,
      '—',
    );

    const subject = b.subject as UnknownRecord | undefined;
    const subjectName = str(
      subject?.nameBn ?? subject?.name ?? b.subjectName,
      '—',
    );

    const priceBdt = b.pricePerSessionMinor != null
      ? Number(b.pricePerSessionMinor) / 100
      : Number(b.priceBdt ?? b.amountMinor ?? 0);

    return {
      id: String(b.id),
      studentName,
      tutorName,
      subjectName,
      status: (b.status as AdminBookingItem['status']) ?? 'requested',
      priceBdt,
      mode: b.mode === 'in_person' ? 'in_person' : 'online',
      escrowStatus: strOrNull(b.escrowStatus as string),
      createdAt: str(b.createdAt as string, ''),
    };
  });
}

export function mapAuditLogs(rows: unknown[]): AdminAuditLogItem[] {
  return (rows as UnknownRecord[]).map((l) => ({
    id: String(l.id),
    actorUserId: strOrNull(l.actorUserId),
    action: str(l.action),
    resourceType: str(l.resourceType),
    resourceId: strOrNull(l.resourceId),
    reason: strOrNull(l.reason),
    createdAt: str(l.createdAt),
  }));
}

const SUPPORT_STATUSES: readonly string[] = ['submitted', 'in_review', 'resolved', 'spam'];

export function mapSupportTickets(rows: unknown[]): AdminSupportTicketItem[] {
  return (rows as UnknownRecord[]).map((row) => {
    const rawStatus = str(row.status, 'submitted');
    return {
      id: String(row.id),
      name: str(row.name, '—'),
      email: str(row.email, '—'),
      phoneE164: strOrNull(row.phoneE164),
      category: str(row.category, 'general'),
      message: str(row.message),
      status: (SUPPORT_STATUSES.includes(rawStatus)
        ? rawStatus
        : 'submitted') as AdminSupportTicketItem['status'],
      reporterUserId: strOrNull(row.reporterUserId),
      resolutionNotes: strOrNull(row.resolutionNotes),
      createdAt: str(row.createdAt),
    };
  });
}

export function mapPendingTutors(rows: unknown[]): PendingTutorItem[] {
  return (rows as UnknownRecord[]).map((p) => ({
    userId: String(p.userId ?? p.id ?? ''),
    displayName: str(p.displayName ?? p.email, '—'),
    email: strOrNull(p.email),
    phoneE164: strOrNull(p.phoneE164 ?? p.phone),
    headline: strOrNull(p.headline),
    verificationStatus: str(p.verificationStatus, 'submitted'),
    publicationStatus: str(p.publicationStatus, 'draft'),
    qualificationsCount:
      typeof p.qualificationsCount === 'number'
        ? p.qualificationsCount
        : Array.isArray(p.qualifications)
          ? p.qualifications.length
          : 0,
    submittedAt: str(p.submittedAt ?? p.updatedAt),
  }));
}

export function mapDossierQualifications(value: unknown): TutorDossierQualification[] {
  if (!Array.isArray(value)) return [];
  return (value as UnknownRecord[])
    .filter((q) => typeof q === 'object' && q !== null)
    .map((q) => {
      const evidence =
        typeof q.evidenceAsset === 'object' && q.evidenceAsset !== null
          ? (q.evidenceAsset as UnknownRecord)
          : null;
      return {
        id: String(q.id ?? ''),
        title: str(q.title),
        qualificationType: str(q.qualificationType, 'other'),
        institution: strOrNull(q.institution),
        reviewStatus: str(q.reviewStatus, 'pending'),
        issuedYear: typeof q.issuedYear === 'number' ? q.issuedYear : null,
        evidenceAssetId: strOrNull(q.evidenceAssetId),
        evidenceFilename: evidence ? strOrNull(evidence.originalFilename) : null,
        evidenceMediaType: evidence ? strOrNull(evidence.mediaType) : null,
      };
    })
    .filter((q) => q.id);
}

export function mapReviewHistory(value: unknown): TutorReviewHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return (value as UnknownRecord[])
    .filter((r) => typeof r === 'object' && r !== null)
    .map((r) => ({
      id: String(r.id ?? ''),
      decision: str(r.decision),
      reasonCode: strOrNull(r.reasonCode),
      internalNotes: strOrNull(r.internalNotes),
      reviewerUserId: strOrNull(r.reviewerUserId),
      createdAt: str(r.createdAt),
    }))
    .filter((r) => r.id);
}
