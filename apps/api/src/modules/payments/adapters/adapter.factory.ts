import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentProviderAdapter } from './payment-provider.interface';
import { BkashSandboxAdapter } from './bkash-sandbox.adapter';

@Injectable()
export class PaymentAdapterFactory {
  constructor(private readonly bkashAdapter: BkashSandboxAdapter) {}

  getAdapter(provider: string = 'bkash'): PaymentProviderAdapter {
    const normalized = provider.toLowerCase();
    switch (normalized) {
      case 'bkash':
      case 'nagad':
      case 'sslcommerz':
        return this.bkashAdapter; // In sandbox mode, BkashSandboxAdapter supports Bangladesh MFS flows
      default:
        throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }
  }
}
