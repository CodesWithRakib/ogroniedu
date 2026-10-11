export interface AdminUserItem {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  status: 'active' | 'suspended' | 'pending_verification';
  roles: string[];
  createdAt: string;
}

export interface AdminBookingItem {
  id: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  status: 'requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  priceBdt: number;
  mode: 'online' | 'in_person';
}

export interface AdminAuditLogItem {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  pendingTutorVerifications: number;
  activeReplacementCases: number;
  openSafetyReports: number;
  activeBookingsCount: number;
  totalRegisteredUsers: number;
}

export const EMPTY_METRICS: AdminDashboardMetrics = {
  pendingTutorVerifications: 0,
  activeReplacementCases: 0,
  openSafetyReports: 0,
  activeBookingsCount: 0,
  totalRegisteredUsers: 0,
};
