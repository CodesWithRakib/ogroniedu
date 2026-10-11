export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'awaiting_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'disputed'
  | 'replacement_requested';

export type TutoringMode = 'in_person' | 'online' | 'hybrid';

export interface BookingRequest {
  id: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  status: BookingStatus;
  priceBdt: number;
  mode: TutoringMode | string;
}
