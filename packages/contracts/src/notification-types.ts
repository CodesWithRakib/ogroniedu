export const NotificationCategories = [
  'booking',
  'learning',
  'payment',
  'trust',
  'system',
] as const;
export type NotificationCategory = (typeof NotificationCategories)[number];

export const NotificationPriorities = ['urgent', 'high', 'normal', 'low'] as const;
export type NotificationPriority = (typeof NotificationPriorities)[number];

export const NotificationRoles = [
  'guardian',
  'student',
  'tutor',
  'admin',
  'super_admin',
  // Staff role that owns tutor dossier review (Phase 02). Addressed directly by
  // user id; no implicit super_admin privileges are implied by this entry.
  'compliance_reviewer',
] as const;
export type NotificationRole = (typeof NotificationRoles)[number];

export const NotificationDeliveryChannels = ['in_app', 'email', 'sms', 'push', 'whatsapp'] as const;
export type NotificationDeliveryChannel = (typeof NotificationDeliveryChannels)[number];

export const NotificationEventTypes = [
  'booking.requested',
  'booking.accepted',
  'booking.confirmed',
  'booking.cancelled',
  'booking.declined',
  'session.reminder',
  'session.started',
  'session.completed',
  'attendance.marked',
  'assignment.created',
  'assignment.published',
  'assignment.submitted',
  'assignment.returned',
  'assignment.graded',
  'learning_material.published',
  'learning_goal.updated',
  'payment.succeeded',
  'payment.failed',
  'refund.requested',
  'refund.approved',
  'refund.rejected',
  'refund.processed',
  'refund.failed',
  'invoice.issued',
  'payout.requested',
  'payout.approved',
  'payout.rejected',
  'payout.paid',
  'tutor.earnings_released',
  'progress.published',
  'tutor.verified',
  'tutor.needs_information',
  'tutor.rejected',
  'tutor.verification_submitted',
  'tutor.verification_under_review',
  'tutor.level_approved',
  'tutor.level_decided',
  'tutor.verification_suspended',
  'tutor.verification_expired',
  'tutor.document_expiring',
  'tutor.review_assigned',
  'safety.alert',
  'tutor.replacement',
  'dispute.opened',
  'chat.message',
  'system.announcement',
] as const;
export type NotificationEventType = (typeof NotificationEventTypes)[number];
