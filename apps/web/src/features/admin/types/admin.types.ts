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

export interface AdminReconciliationAccount {
  code: string;
  name: string;
  accountType: string;
  balance: string;
}

export interface AdminReconciliationData {
  isBalanced: boolean;
  totalDebits: string;
  totalCredits: string;
  discrepancy: string;
  status: 'reconciled' | 'discrepancy_detected';
  accounts: AdminReconciliationAccount[];
}

export interface AdminSystemSettingItem {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
}

export interface AdminFeatureFlagItem {
  key: string;
  enabled: boolean;
  rules: Record<string, unknown>;
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
