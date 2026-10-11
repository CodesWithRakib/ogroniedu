import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PaymentProviderAdapter } from './payment-provider.interface';
import { BkashSandboxAdapter } from './bkash-sandbox.adapter';
import { SslcommerzSandboxAdapter } from './sslcommerz-sandbox.adapter';

@Injectable()
export class PaymentAdapterFactory {
  constructor(
    @Inject(BkashSandboxAdapter) private readonly bkashAdapter: BkashSandboxAdapter,
    @Inject(SslcommerzSandboxAdapter) private readonly sslcommerzAdapter: SslcommerzSandboxAdapter,
  ) {}

  getAdapter(provider: string = 'bkash'): PaymentProviderAdapter {
    const normalized = provider.toLowerCase();
    switch (normalized) {
      case 'bkash':
      case 'nagad':
        return this.bkashAdapter;
      case 'sslcommerz':
        return this.sslcommerzAdapter;
      default:
        throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }
  }
}
