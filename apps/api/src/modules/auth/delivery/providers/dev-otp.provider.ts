import {
  OtpDeliveryError,
  type OtpDeliveryChannel,
  type OtpDeliveryProvider,
  type OtpMessage,
} from '../otp-delivery.types';

/**
 * Development/test-only OTP provider.
 *
 * It records deliveries in memory so local flows can be exercised without a
 * telecom/email account. It deliberately NEVER logs the OTP value — the code is
 * surfaced to the caller through the non-production `debugCode` response field
 * instead (see AuthService.requestCode).
 *
 * This provider refuses to operate whenever `NODE_ENV=production`, so it cannot
 * silently become an insecure production fallback.
 */
export class DevOtpProvider implements OtpDeliveryProvider {
  readonly name = 'dev';

  /** Deliveries observed since process start — test/dev observability only. */
  private readonly sent: OtpMessage[] = [];

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  isConfigured(): boolean {
    return this.env.NODE_ENV !== 'production';
  }

  supports(_channel: OtpDeliveryChannel): boolean {
    return true;
  }

  async send(message: OtpMessage): Promise<void> {
    if (this.env.NODE_ENV === 'production') {
      throw new OtpDeliveryError(
        'not_configured',
        'Dev OTP provider is disabled in production',
        false,
      );
    }
    this.sent.push(message);
  }

  /** Test helper: deliveries captured so far (includes the code, test-only). */
  getDeliveredMessages(): readonly OtpMessage[] {
    return this.sent;
  }
}
