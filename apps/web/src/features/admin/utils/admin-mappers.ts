import type {
  AdminAuditLogItem,
  AdminBookingItem,
  AdminUserItem,
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
  return (rows as UnknownRecord[]).map((b) => ({
    id: String(b.id),
    studentName: str(b.studentName ?? b.studentId, '—'),
    tutorName: str(b.tutorName ?? b.tutorId, '—'),
    subjectName: str(b.subjectName, '—'),
    status: (b.status as AdminBookingItem['status']) ?? 'requested',
    priceBdt: Number(b.priceBdt ?? b.amountMinor ?? 0),
    mode: b.mode === 'in_person' ? 'in_person' : 'online',
  }));
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
