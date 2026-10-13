export type SupportTicketStatus = 'submitted' | 'in_review' | 'resolved' | 'spam';

export const SUPPORT_TICKET_STATUSES: readonly SupportTicketStatus[] = [
  'submitted',
  'in_review',
  'resolved',
  'spam',
];

/** Terminal states: no further staff transitions expected. */
export const SUPPORT_TICKET_TERMINAL_STATUSES: readonly SupportTicketStatus[] = [
  'resolved',
  'spam',
];
