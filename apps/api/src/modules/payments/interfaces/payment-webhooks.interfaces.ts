import type { PaymentOrderEntity, InvoiceEntity } from '../entities';
import type { BookingEntity } from '../../bookings/entities/booking.entity';

export interface ConfirmedPayment {
  order: PaymentOrderEntity;
  booking: BookingEntity | null;
  invoice: InvoiceEntity | null;
}
