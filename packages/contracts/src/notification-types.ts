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

export const NotificationRoles = ['guardian', 'student', 'tutor', 'admin', 'super_admin'] as const;
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
  'attendance.marked',
  'assignment.created',
  'assignment.submitted',
  'assignment.graded',
  'payment.succeeded',
  'payment.failed',
  'refund.processed',
  'progress.published',
  'tutor.verified',
  'tutor.needs_information',
  'tutor.rejected',
  'safety.alert',
  'tutor.replacement',
  'dispute.opened',
  'chat.message',
  'system.announcement',
] as const;
export type NotificationEventType = (typeof NotificationEventTypes)[number];
