import { z } from 'zod';

/** Payment contracts. Mirrors payments/dto (order + refund only — provider
 * webhook signatures are exempt from the envelope and stay provider-shaped). */

export const PaymentProviders = ['bkash', 'nagad', 'sslcommerz'] as const;
export const PaymentMethods = ['bkash', 'nagad', 'rocket', 'upay', 'card'] as const;

export const CreatePaymentOrderSchema = z.object({
  bookingId: z.string().uuid(),
  provider: z.enum(PaymentProviders).optional(),
  paymentMethod: z.enum(PaymentMethods).optional(),
  amountMinor: z.union([z.string(), z.number()]).optional(),
  locale: z.enum(['bn', 'en']).optional(),
});
export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderSchema>;

export const ProcessRefundSchema = z.object({
  paymentOrderId: z.string().uuid(),
  amountMinor: z.number().min(100),
  reason: z.string().min(5).max(500),
});
export type ProcessRefundInput = z.infer<typeof ProcessRefundSchema>;

export const SettleMilestoneSchema = z.object({
  sessionId: z.string().uuid(),
});
export type SettleMilestoneInput = z.infer<typeof SettleMilestoneSchema>;
