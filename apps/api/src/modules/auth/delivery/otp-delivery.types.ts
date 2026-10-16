/** Channels an OTP can be delivered over. */
export type OtpDeliveryChannel = 'sms' | 'email';

/** Purpose of an OTP — mirrors auth_verification_codes.purpose. */
export type OtpPurpose = 'contact_verification' | 'password_recovery' | 'login_2fa' | 'magic_link';

export interface OtpMessage {
  channel: OtpDeliveryChannel;
  /** E.164 phone number or email address. Never logged in full. */
  to: string;
  /** The one-time code. Providers MUST NOT log this value. */
  code: string;
  purpose: OtpPurpose;
  locale: 'bn' | 'en';
}

/** Failure classification used to decide whether fallback is eligible. */
export type OtpDeliveryFailureCode =
  | 'timeout'
  | 'network_error'
  | 'provider_unavailable'
  | 'rate_limited'
  | 'invalid_destination'
  | 'not_configured'
  | 'unknown_error';

export interface OtpDeliveryAttempt {
  provider: string;
  ok: boolean;
  failureCode?: OtpDeliveryFailureCode;
  /** Retryable failures are eligible for the configured fallback provider. */
  retryable?: boolean;
}

export interface OtpDeliveryResult {
  delivered: boolean;
  /** Name of the provider that accepted the message, when delivered. */
  provider?: string;
  attempts: OtpDeliveryAttempt[];
  failureCode?: OtpDeliveryFailureCode;
}

/**
 * A single delivery backend. Implementations must never log the OTP value, and
 * must fail closed (throw) so the service can classify and fall back.
 */
export interface OtpDeliveryProvider {
  readonly name: string;
  /** True when the provider is usable in the current environment/config. */
  isConfigured(): boolean;
  supports(channel: OtpDeliveryChannel): boolean;
  /** Deliver the message or throw an {@link OtpDeliveryError}. */
  send(message: OtpMessage): Promise<void>;
}

export class OtpDeliveryError extends Error {
  constructor(
    readonly code: OtpDeliveryFailureCode,
    message: string,
    readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'OtpDeliveryError';
  }
}

/** Mask a phone/email for safe operational logging (never includes the OTP). */
export function maskDestination(destination: string): string {
  if (destination.includes('@')) {
    const [local, domain] = destination.split('@');
    const head = local.slice(0, 1);
    return `${head}***@${domain}`;
  }
  if (destination.length <= 4) return '***';
  return `${destination.slice(0, 3)}****${destination.slice(-2)}`;
}
