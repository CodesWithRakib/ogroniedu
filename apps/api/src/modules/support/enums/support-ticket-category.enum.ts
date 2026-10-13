export type SupportTicketCategory =
  | 'general'
  | 'tutorHelp'
  | 'tutorVerification'
  | 'paymentSupport'
  | 'safetyIncident';

export const SUPPORT_TICKET_CATEGORIES: readonly SupportTicketCategory[] = [
  'general',
  'tutorHelp',
  'tutorVerification',
  'paymentSupport',
  'safetyIncident',
];
