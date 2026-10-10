import {
  NotificationCategory,
  NotificationEventType,
  NotificationPriority,
  NotificationRole,
} from './notification-types';

export interface NotificationDefinition {
  type: NotificationEventType;
  category: NotificationCategory;
  priority: NotificationPriority;
  allowedRoles: readonly NotificationRole[];
  titleKey: string;
  bodyKey: string;
  templateEn: {
    title: string;
    body: string;
  };
  templateBn: {
    title: string;
    body: string;
  };
  persist: boolean;
  inAppToast: boolean;
  navigationTarget: string;
  variables: readonly string[];
}

export const NOTIFICATION_REGISTRY: Record<NotificationEventType, NotificationDefinition> = {
  'booking.requested': {
    type: 'booking.requested',
    category: 'booking',
    priority: 'high',
    allowedRoles: ['tutor'],
    titleKey: 'notifications.booking_requested.title',
    bodyKey: 'notifications.booking_requested.body',
    templateEn: {
      title: 'New Booking Request',
      body: 'You received a booking request for {{subjectName}} from {{requesterName}}.',
    },
    templateBn: {
      title: 'নতুন বুকিং অনুরোধ',
      body: '{{requesterName}} থেকে {{subjectName}} বিষয়ের জন্য একটি নতুন বুকিং অনুরোধ এসেছে।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/tutor/bookings/{{bookingId}}',
    variables: ['bookingId', 'subjectName', 'requesterName'],
  },
  'booking.accepted': {
    type: 'booking.accepted',
    category: 'booking',
    priority: 'high',
    allowedRoles: ['guardian', 'student'],
    titleKey: 'notifications.booking_accepted.title',
    bodyKey: 'notifications.booking_accepted.body',
    templateEn: {
      title: 'Booking Accepted — Payment Due',
      body: 'Tutor {{tutorName}} accepted your request for {{subjectName}}. Please complete payment to confirm.',
    },
    templateBn: {
      title: 'বুকিং গৃহীত হয়েছে — পেমেন্ট করুন',
      body: 'শিক্ষক {{tutorName}} {{subjectName}} বিষয়ের বুকিং গ্রহণ করেছেন। নিশ্চিত করতে অনুগ্রহ করে ফি পরিশোধ করুন।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/bookings/{{bookingId}}/pay',
    variables: ['bookingId', 'tutorName', 'subjectName'],
  },
  'booking.confirmed': {
    type: 'booking.confirmed',
    category: 'booking',
    priority: 'high',
    allowedRoles: ['guardian', 'student', 'tutor'],
    titleKey: 'notifications.booking_confirmed.title',
    bodyKey: 'notifications.booking_confirmed.body',
    templateEn: {
      title: 'Booking Confirmed',
      body: 'Your tuition booking for {{subjectName}} is confirmed. Next session: {{nextSessionTime}}.',
    },
    templateBn: {
      title: 'টিউশন বুকিং নিশ্চিত হয়েছে',
      body: '{{subjectName}} বিষয়ের টিউশন বুকিং নিশ্চিত হয়েছে। পরবর্তী ক্লাস: {{nextSessionTime}}।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/bookings/{{bookingId}}',
    variables: ['bookingId', 'subjectName', 'nextSessionTime'],
  },
  'booking.cancelled': {
    type: 'booking.cancelled',
    category: 'booking',
    priority: 'urgent',
    allowedRoles: ['guardian', 'student', 'tutor'],
    titleKey: 'notifications.booking_cancelled.title',
    bodyKey: 'notifications.booking_cancelled.body',
    templateEn: {
      title: 'Booking Cancelled',
      body: 'Booking for {{subjectName}} was cancelled. Reason: {{reason}}.',
    },
    templateBn: {
      title: 'বুকিং বাতিল করা হয়েছে',
      body: '{{subjectName}} বিষয়ের বুকিং বাতিল হয়েছে। কারণ: {{reason}}।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/bookings/{{bookingId}}',
    variables: ['bookingId', 'subjectName', 'reason'],
  },
  'booking.declined': {
    type: 'booking.declined',
    category: 'booking',
    priority: 'normal',
    allowedRoles: ['guardian', 'student'],
    titleKey: 'notifications.booking_declined.title',
    bodyKey: 'notifications.booking_declined.body',
    templateEn: {
      title: 'Booking Request Declined',
      body: 'Tutor {{tutorName}} was unable to accept your request. Explore other verified tutors.',
    },
    templateBn: {
      title: 'বুকিং অনুরোধ গৃহীত হয়নি',
      body: 'শিক্ষক {{tutorName}} আপনার অনুরোধ গ্রহণ করতে পারেননি। অন্য যাচাইকৃত শিক্ষক খুঁজুন।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/tutors',
    variables: ['bookingId', 'tutorName'],
  },
  'session.reminder': {
    type: 'session.reminder',
    category: 'booking',
    priority: 'normal',
    allowedRoles: ['guardian', 'student', 'tutor'],
    titleKey: 'notifications.session_reminder.title',
    bodyKey: 'notifications.session_reminder.body',
    templateEn: {
      title: 'Session Reminder',
      body: 'Your session for {{subjectName}} starts in 30 minutes ({{startTime}}).',
    },
    templateBn: {
      title: 'ক্লাসের রিমাইন্ডার',
      body: '{{subjectName}} বিষয়ের ক্লাস আগামী ৩০ মিনিটে ({{startTime}}) শুরু হবে।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/sessions/{{sessionId}}',
    variables: ['sessionId', 'subjectName', 'startTime'],
  },
  'attendance.marked': {
    type: 'attendance.marked',
    category: 'learning',
    priority: 'normal',
    allowedRoles: ['guardian', 'student'],
    titleKey: 'notifications.attendance_marked.title',
    bodyKey: 'notifications.attendance_marked.body',
    templateEn: {
      title: 'Attendance Recorded',
      body: 'Attendance marked as {{status}} for {{studentName}} in {{subjectName}}.',
    },
    templateBn: {
      title: 'উপস্থিতি রেকর্ড করা হয়েছে',
      body: '{{subjectName}} ক্লাসে {{studentName}}-এর উপস্থিতি "{{status}}" হিসেবে চিহ্নিত হয়েছে।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/sessions/{{sessionId}}',
    variables: ['sessionId', 'studentName', 'subjectName', 'status'],
  },
  'assignment.created': {
    type: 'assignment.created',
    category: 'learning',
    priority: 'normal',
    allowedRoles: ['student', 'guardian'],
    titleKey: 'notifications.assignment_created.title',
    bodyKey: 'notifications.assignment_created.body',
    templateEn: {
      title: 'New Homework Assigned',
      body: 'New assignment "{{assignmentTitle}}" posted for {{subjectName}}. Due: {{dueDate}}.',
    },
    templateBn: {
      title: 'নতুন বাড়ির কাজ দেওয়া হয়েছে',
      body: '{{subjectName}} বিষয়ের নতুন বাড়ির কাজ "{{assignmentTitle}}" দেওয়া হয়েছে। জমার শেষ তারিখ: {{dueDate}}।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/assignments/{{assignmentId}}',
    variables: ['assignmentId', 'assignmentTitle', 'subjectName', 'dueDate'],
  },
  'assignment.submitted': {
    type: 'assignment.submitted',
    category: 'learning',
    priority: 'normal',
    allowedRoles: ['tutor'],
    titleKey: 'notifications.assignment_submitted.title',
    bodyKey: 'notifications.assignment_submitted.body',
    templateEn: {
      title: 'Homework Submitted',
      body: '{{studentName}} submitted "{{assignmentTitle}}".',
    },
    templateBn: {
      title: 'বাড়ির কাজ জমা দেওয়া হয়েছে',
      body: '{{studentName}} "{{assignmentTitle}}" সম্পন্ন করে জমা দিয়েছে।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/assignments/{{assignmentId}}/submissions',
    variables: ['assignmentId', 'studentName', 'assignmentTitle'],
  },
  'assignment.graded': {
    type: 'assignment.graded',
    category: 'learning',
    priority: 'normal',
    allowedRoles: ['student', 'guardian'],
    titleKey: 'notifications.assignment_graded.title',
    bodyKey: 'notifications.assignment_graded.body',
    templateEn: {
      title: 'Homework Reviewed',
      body: 'Tutor reviewed "{{assignmentTitle}}". Grade: {{grade}}.',
    },
    templateBn: {
      title: 'বাড়ির কাজ মূল্যায়ন সম্পন্ন',
      body: 'শিক্ষক "{{assignmentTitle}}" মূল্যায়ন করেছেন। প্রাপ্ত গ্রেড: {{grade}}।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/assignments/{{assignmentId}}',
    variables: ['assignmentId', 'assignmentTitle', 'grade'],
  },
  'payment.succeeded': {
    type: 'payment.succeeded',
    category: 'payment',
    priority: 'high',
    allowedRoles: ['guardian', 'student'],
    titleKey: 'notifications.payment_succeeded.title',
    bodyKey: 'notifications.payment_succeeded.body',
    templateEn: {
      title: 'Payment Succeeded',
      body: 'Payment of BDT {{amount}} received for booking #{{bookingId}}. View receipt.',
    },
    templateBn: {
      title: 'পেমেন্ট সফল হয়েছে',
      body: 'বুকিং #{{bookingId}}-এর জন্য ৳ {{amount}} সফলভাবে পরিশোধ হয়েছে। রসিদ দেখুন।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/payments/{{paymentId}}',
    variables: ['paymentId', 'bookingId', 'amount'],
  },
  'payment.failed': {
    type: 'payment.failed',
    category: 'payment',
    priority: 'urgent',
    allowedRoles: ['guardian', 'student'],
    titleKey: 'notifications.payment_failed.title',
    bodyKey: 'notifications.payment_failed.body',
    templateEn: {
      title: 'Payment Unsuccessful',
      body: 'Payment transaction of BDT {{amount}} could not be completed. Please retry.',
    },
    templateBn: {
      title: 'পেমেন্ট ব্যর্থ হয়েছে',
      body: '৳ {{amount}} পেমেন্ট সম্পন্ন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/bookings/{{bookingId}}/pay',
    variables: ['bookingId', 'amount'],
  },
  'refund.processed': {
    type: 'refund.processed',
    category: 'payment',
    priority: 'high',
    allowedRoles: ['guardian', 'student'],
    titleKey: 'notifications.refund_processed.title',
    bodyKey: 'notifications.refund_processed.body',
    templateEn: {
      title: 'Refund Processed',
      body: 'Refund of BDT {{amount}} has been credited. Reference: {{refundId}}.',
    },
    templateBn: {
      title: 'রিফান্ড সম্পন্ন হয়েছে',
      body: '৳ {{amount}} রিফান্ড প্রদান করা হয়েছে। ট্র্যাকিং নম্বর: {{refundId}}।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/payments/refunds/{{refundId}}',
    variables: ['refundId', 'amount'],
  },
  'progress.published': {
    type: 'progress.published',
    category: 'learning',
    priority: 'normal',
    allowedRoles: ['guardian', 'student'],
    titleKey: 'notifications.progress_published.title',
    bodyKey: 'notifications.progress_published.body',
    templateEn: {
      title: 'New Progress Report Published',
      body: 'Progress evaluation for {{studentName}} ({{period}}) is now available to view.',
    },
    templateBn: {
      title: 'অগ্রগতি রিপোর্ট প্রকাশিত হয়েছে',
      body: '{{studentName}}-এর অগ্রগতি রিপোর্ট ({{period}}) দেখার জন্য প্রস্তুত।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/progress/{{reportId}}',
    variables: ['reportId', 'studentName', 'period'],
  },
  'tutor.verified': {
    type: 'tutor.verified',
    category: 'trust',
    priority: 'high',
    allowedRoles: ['tutor'],
    titleKey: 'notifications.tutor_verified.title',
    bodyKey: 'notifications.tutor_verified.body',
    templateEn: {
      title: 'Tutor Profile Approved!',
      body: 'Congratulations! Your credentials have been verified and your profile is now live.',
    },
    templateBn: {
      title: 'শিক্ষক প্রোফাইল অনুমোদিত!',
      body: 'অভিনন্দন! আপনার সনদপত্র যাচাই সম্পন্ন হয়েছে এবং আপনার প্রোফাইল এখন প্রকাশ করা হয়েছে।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/tutor/profile',
    variables: [],
  },
  'tutor.needs_information': {
    type: 'tutor.needs_information',
    category: 'trust',
    priority: 'urgent',
    allowedRoles: ['tutor'],
    titleKey: 'notifications.tutor_needs_information.title',
    bodyKey: 'notifications.tutor_needs_information.body',
    templateEn: {
      title: 'Verification Requires Additional Details',
      body: 'Please provide requested documents: {{notes}}.',
    },
    templateBn: {
      title: 'যাচাইকরণের জন্য অতিরিক্ত তথ্যের প্রয়োজন',
      body: 'অনুরোধকৃত নথিপত্র আপলোড করুন: {{notes}}।',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/tutor/verification',
    variables: ['notes'],
  },
  'system.announcement': {
    type: 'system.announcement',
    category: 'system',
    priority: 'normal',
    allowedRoles: ['guardian', 'student', 'tutor', 'admin', 'super_admin'],
    titleKey: 'notifications.system_announcement.title',
    bodyKey: 'notifications.system_announcement.body',
    templateEn: {
      title: 'Platform Notice',
      body: '{{messageEn}}',
    },
    templateBn: {
      title: 'প্ল্যাটফর্ম নোটিশ',
      body: '{{messageBn}}',
    },
    persist: true,
    inAppToast: true,
    navigationTarget: '/announcements',
    variables: ['messageEn', 'messageBn'],
  },
};

export function getNotificationDefinition(type: NotificationEventType): NotificationDefinition {
  const def = NOTIFICATION_REGISTRY[type];
  if (!def) {
    throw new Error(`Unregistered notification event type: ${type}`);
  }
  return def;
}

export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number> = {},
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
  });
}
