import { BadRequestException } from '@nestjs/common';
import type { SessionStatus } from '../entities/booking-session.entity';

export const SESSION_TRANSITIONS: Readonly<Record<SessionStatus, readonly SessionStatus[]>> = {
  scheduled: ['in_progress', 'cancelled', 'reschedule_pending'],
  reschedule_pending: ['scheduled', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransitionSession(from: SessionStatus, to: SessionStatus): boolean {
  return SESSION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertSessionTransition(from: SessionStatus, to: SessionStatus): void {
  if (from === to) return;
  if (!canTransitionSession(from, to)) {
    throw new BadRequestException(`Invalid session status transition: '${from}' -> '${to}'.`);
  }
}

export const CANCELLABLE_SESSION_STATUSES: readonly SessionStatus[] = [
  'scheduled',
  'reschedule_pending',
];

export const RESCHEDULABLE_SESSION_STATUSES: readonly SessionStatus[] = [
  'scheduled',
  'reschedule_pending',
];
