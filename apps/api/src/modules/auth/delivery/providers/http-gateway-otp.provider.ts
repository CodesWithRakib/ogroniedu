import {
  OtpDeliveryError,
  type OtpDeliveryChannel,
  type OtpDeliveryFailureCode,
  type OtpDeliveryProvider,
  type OtpMessage,
} from '../otp-delivery.types';

export interface HttpGatewayConfig {
  /** Provider name used in configuration and operational logs. */
  name: string;
  smsUrl?: string;
  emailUrl?: string;
  apiKey?: string;
  senderId?: string;
  timeoutMs: number;
}

/** Classify an HTTP status into a delivery failure code (never a provider body). */
export function classifyHttpStatus(status: number): {
  code: OtpDeliveryFailureCode;
  retryable: boolean;
} {
  if (status === 429) return { code: 'rate_limited', retryable: true };
  if (status === 408) return { code: 'timeout', retryable: true };
  if (status >= 500) return { code: 'provider_unavailable', retryable: true };
  if (status === 400 || status === 422) return { code: 'invalid_destination', retryable: false };
  return { code: 'unknown_error', retryable: false };
}

/**
 * Configuration-driven HTTP gateway provider for SMS aggregators / email APIs.
 *
 * No vendor-specific endpoint is invented: the URL, API key and sender id come
 * from environment configuration and the payload is the minimal portable shape
 * (`to`, `sender`, `message`). Operators wire the concrete provider contract
 * (for example a Bangladesh SMS aggregator) through these variables — see
 * `docs/features/authentication/IMPLEMENTATION_REPORT.md` §11.
 */
export class HttpGatewayOtpProvider implements OtpDeliveryProvider {
  constructor(private readonly config: HttpGatewayConfig) {}

  get name(): string {
    return this.config.name;
  }

  isConfigured(): boolean {
    if (!this.config.apiKey) return false;
    return Boolean(this.config.smsUrl || this.config.emailUrl);
  }

  supports(channel: OtpDeliveryChannel): boolean {
    return channel === 'sms' ? Boolean(this.config.smsUrl) : Boolean(this.config.emailUrl);
  }

  async send(message: OtpMessage): Promise<void> {
    const url = message.channel === 'sms' ? this.config.smsUrl : this.config.emailUrl;
    if (!url || !this.config.apiKey) {
      throw new OtpDeliveryError('not_configured', 'Delivery provider is not configured', false);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          to: message.to,
          channel: message.channel,
          sender: this.config.senderId,
          // Provider-agnostic message text; the code is the only dynamic value.
          message:
            message.locale === 'bn'
              ? `OgroniEdu যাচাইকরণ কোড: ${message.code}`
              : `OgroniEdu verification code: ${message.code}`,
          template: `otp_${message.purpose}`,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const { code, retryable } = classifyHttpStatus(response.status);
        throw new OtpDeliveryError(code, `Delivery provider rejected request (${code})`, retryable);
      }
    } catch (err: unknown) {
      if (err instanceof OtpDeliveryError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OtpDeliveryError('timeout', 'Delivery provider timed out', true);
      }
      throw new OtpDeliveryError('network_error', 'Delivery provider unreachable', true);
    } finally {
      clearTimeout(timer);
    }
  }
}
