import { IsEnum, IsOptional, IsString, MaxLength, IsObject } from 'class-validator';

export enum AllowedAnalyticsEvent {
  REGISTRATION_STARTED = 'registration_started',
  REGISTRATION_COMPLETED = 'registration_completed',
  ONBOARDING_STEP_COMPLETED = 'onboarding_step_completed',
  ONBOARDING_COMPLETED = 'onboarding_completed',
  TUTOR_SEARCH_PERFORMED = 'tutor_search_performed',
  TUTOR_PROFILE_VIEWED = 'tutor_profile_viewed',
  BOOKING_STARTED = 'booking_started',
  BOOKING_REQUEST_SUBMITTED = 'booking_request_submitted',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  SESSION_ATTENDED = 'session_attended',
  SESSION_COMPLETED = 'session_completed',
  HOMEWORK_SUBMITTED = 'homework_submitted',
  HOMEWORK_REVIEWED = 'homework_reviewed',
  FEEDBACK_SUBMITTED = 'feedback_submitted',
}

/**
 * Events that clients are permitted to emit directly from web browsers.
 * Server-authoritative lifecycle events (booking_confirmed, session_completed, etc.)
 * cannot be claimed by clients and are generated exclusively by backend domain transitions.
 */
export const CLIENT_PERMITTED_EVENTS = new Set<AllowedAnalyticsEvent>([
  AllowedAnalyticsEvent.REGISTRATION_STARTED,
  AllowedAnalyticsEvent.ONBOARDING_STEP_COMPLETED,
  AllowedAnalyticsEvent.TUTOR_SEARCH_PERFORMED,
  AllowedAnalyticsEvent.TUTOR_PROFILE_VIEWED,
  AllowedAnalyticsEvent.BOOKING_STARTED,
  AllowedAnalyticsEvent.FEEDBACK_SUBMITTED,
]);

export class TrackEventDto {
  @IsEnum(AllowedAnalyticsEvent, { message: 'Invalid or disallowed analytics eventName' })
  eventName!: AllowedAnalyticsEvent;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityId?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  clientTimestamp?: string;
}
