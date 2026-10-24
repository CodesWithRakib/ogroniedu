import type { NotificationRole } from '@ogroniedu/contracts';

export interface VerificationReviewerRecipient {
  userId: string;
  roles: string[];
  /** Role claimed on the notification, must be eligible for the event type. */
  notificationRole: NotificationRole;
}
