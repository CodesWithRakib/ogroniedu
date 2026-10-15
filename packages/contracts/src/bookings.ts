import { z } from 'zod';
import { IsoDateString } from './pagination.js';

/** Booking + session contracts. Mirrors bookings/dto. */

export const TutoringModes = ['in_person', 'online', 'hybrid'] as const;
export const BookingActions = ['accept', 'decline'] as const;
export const SessionStatuses = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'reschedule_pending',
] as const;

export const CreateBookingRequestSchema = z.object({
  tutorId: z.string().uuid(),
  studentId: z.string().uuid(),
  subjectId: z.string().uuid(),
  educationLevelId: z.string().uuid(),
  mode: z.enum(TutoringModes),
  messageNotes: z.string().max(1000).optional(),
  preferredDays: z.array(z.number().int().min(0).max(6)).optional(),
});
export type CreateBookingRequestInput = z.infer<typeof CreateBookingRequestSchema>;

export const RespondBookingRequestSchema = z.object({
  action: z.enum(BookingActions),
  reasonNotes: z.string().max(500).optional(),
});
export type RespondBookingRequestInput = z.infer<typeof RespondBookingRequestSchema>;

export const WithdrawBookingRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type WithdrawBookingRequestInput = z.infer<typeof WithdrawBookingRequestSchema>;

export const CreateSessionSchema = z.object({
  bookingId: z.string().uuid(),
  startsAt: IsoDateString,
  endsAt: IsoDateString.optional(),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  meetingUrl: z.string().max(500).optional(),
  locationInstructions: z.string().max(1000).optional(),
  timezone: z
    .string()
    .regex(/^[A-Za-z0-9_/+-]+$/)
    .optional(),
});
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

export const RescheduleSessionSchema = z.object({
  newStartsAt: IsoDateString,
  newEndsAt: IsoDateString.optional(),
  reason: z.string().min(5).max(500),
});
export type RescheduleSessionInput = z.infer<typeof RescheduleSessionSchema>;

export const CancelSessionSchema = z.object({
  reason: z.string().min(5).max(500),
});
export type CancelSessionInput = z.infer<typeof CancelSessionSchema>;

const weeklySlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startLocal: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  durationMinutes: z.number().int().min(15).max(480).optional(),
});

export const CreateRecurringSessionsSchema = z.object({
  bookingId: z.string().uuid(),
  startDate: IsoDateString,
  count: z.number().int().min(1).max(24).optional(),
  scheduleSlots: z.array(weeklySlotSchema),
  meetingUrl: z.string().max(500).optional(),
  locationInstructions: z.string().max(1000).optional(),
  timezone: z.string().optional(),
});
export type CreateRecurringSessionsInput = z.infer<typeof CreateRecurringSessionsSchema>;

export const GetSessionsQuerySchema = z.object({
  bookingId: z.string().uuid().optional(),
  tutorId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  from: IsoDateString.optional(),
  to: IsoDateString.optional(),
  status: z.enum(SessionStatuses).optional(),
});
export type GetSessionsQuery = z.infer<typeof GetSessionsQuerySchema>;
