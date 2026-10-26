import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { InvoiceEntity, PaymentOrderEntity } from '../entities';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { minorToBdtString, splitCommission } from '../../../common/money/money';

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Durable invoices. The number comes from a database sequence inside the
 * payment transaction, so two concurrent payments can never share a number.
 */
@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
    @Optional()
    @Inject(GuardianAccessService)
    private readonly guardianAccess?: GuardianAccessService,
  ) {}

  async createForOrder(
    manager: EntityManager,
    order: PaymentOrderEntity,
    booking: BookingEntity,
    commissionRateBps: number,
  ): Promise<InvoiceEntity> {
    const existing = await manager.findOne(InvoiceEntity, {
      where: { paymentOrderId: order.id },
    });
    if (existing) return existing;

    const sequenceResult = await manager.query<Array<{ nextval: string }>>(
      "SELECT nextval('invoice_number_seq')::text AS nextval",
    );
    const sequence = sequenceResult[0]?.nextval ?? '1';
    const year = new Date().getUTCFullYear();
    const invoiceNumber = `INV-${year}-${sequence.padStart(6, '0')}`;

    const gross = BigInt(order.amountMinor);
    const { platformFeeMinor } = splitCommission(gross, commissionRateBps);

    const invoice = manager.create(InvoiceEntity, {
      invoiceNumber,
      paymentOrderId: order.id,
      bookingId: booking.id,
      payerUserId: order.payerUserId,
      studentUserId: booking.studentUserId,
      tutorUserId: booking.tutorUserId,
      currency: order.currency,
      subtotalMinor: gross.toString(),
      totalMinor: gross.toString(),
      commissionRateBps,
      commissionMinor: platformFeeMinor.toString(),
      status: 'issued',
      snapshot: {
        payerName: order.payerUser?.displayName ?? null,
        studentName: booking.studentUser?.displayName ?? null,
        tutorName: booking.tutorProfile?.user?.displayName ?? null,
        subjectName: booking.subject?.nameEn ?? null,
        bookingReference: `#${booking.id.slice(0, 8).toUpperCase()}`,
        sessionCount: 1,
      },
    });

    return manager.save(invoice);
  }

  private async assertCanRead(user: AuthenticatedUser, invoice: InvoiceEntity): Promise<void> {
    if (isAdminRole(user)) return;
    if (user.id === invoice.payerUserId || user.id === invoice.studentUserId) return;
    if (this.guardianAccess && invoice.studentUserId) {
      const isLinked = await this.guardianAccess.hasActiveLink(user.id, invoice.studentUserId);
      if (isLinked) return;
    }
    throw new ForbiddenException('Access denied to this invoice');
  }

  async getInvoice(user: AuthenticatedUser, invoiceIdOrNumber: string): Promise<InvoiceEntity> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      invoiceIdOrNumber,
    );
    const invoice = await this.invoiceRepo.findOne({
      where: isUuid ? { id: invoiceIdOrNumber } : { invoiceNumber: invoiceIdOrNumber },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.assertCanRead(user, invoice);
    return invoice;
  }

  async getInvoiceForOrder(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<InvoiceEntity | null> {
    const invoice = await this.invoiceRepo.findOne({ where: { paymentOrderId: orderId } });
    if (!invoice) return null;
    await this.assertCanRead(user, invoice);
    return invoice;
  }

  /** Printable HTML invoice. PDF generation is not available in this build. */
  async renderInvoiceHtml(
    user: AuthenticatedUser,
    invoiceId: string,
    locale: 'bn' | 'en',
  ): Promise<string> {
    const invoice = await this.getInvoice(user, invoiceId);
    const isBn = locale === 'bn';
    const snapshot = invoice.snapshot;
    const total = minorToBdtString(invoice.totalMinor);
    const commission = minorToBdtString(invoice.commissionMinor);
    const tutorNet = minorToBdtString(BigInt(invoice.totalMinor) - BigInt(invoice.commissionMinor));

    const rows = [
      [isBn ? 'ইনভয়েস নম্বর' : 'Invoice number', invoice.invoiceNumber],
      [isBn ? 'ইস্যু তারিখ' : 'Issued at', invoice.issuedAt.toISOString().slice(0, 10)],
      [isBn ? 'বুকিং রেফারেন্স' : 'Booking reference', snapshot.bookingReference],
      [isBn ? 'শিক্ষার্থী' : 'Student', snapshot.studentName ?? '—'],
      [isBn ? 'শিক্ষক' : 'Tutor', snapshot.tutorName ?? '—'],
      [isBn ? 'বিষয়' : 'Subject', snapshot.subjectName ?? '—'],
      [isBn ? 'পরিশোধকারী' : 'Paid by', snapshot.payerName ?? '—'],
      [isBn ? 'সাবটোটাল' : 'Subtotal', `BDT ${total}`],
      [isBn ? 'মোট' : 'Total', `BDT ${total}`],
      [
        isBn ? 'প্ল্যাটফর্ম কমিশন (রেকর্ডের জন্য)' : 'Platform commission (record only)',
        `BDT ${commission}`,
      ],
      [isBn ? 'শিক্ষকের প্রাপ্য (রেকর্ডের জন্য)' : 'Tutor net (record only)', `BDT ${tutorNet}`],
    ];

    return `<!doctype html>
<html lang="${isBn ? 'bn' : 'en'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(invoice.invoiceNumber)} — OgroniEdu</title>
<style>
  :root { color-scheme: light; }
  body { font-family: 'Noto Sans Bengali', 'Hind Siliguri', system-ui, sans-serif; margin: 0; background: #f6f7f9; color: #14202b; }
  main { max-width: 760px; margin: 32px auto; background: #fff; padding: 40px; border: 1px solid #dde3ea; border-radius: 16px; }
  h1 { margin: 0; font-size: 24px; }
  .muted { color: #5b6b7c; font-size: 13px; }
  .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #14202b; padding-bottom: 20px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 12px 8px; border-bottom: 1px solid #e8edf3; font-size: 14px; vertical-align: top; }
  td:last-child { text-align: right; font-weight: 600; }
  .total td { font-size: 18px; font-weight: 800; border-bottom: none; padding-top: 20px; }
  .note { margin-top: 28px; font-size: 12px; color: #5b6b7c; line-height: 1.6; }
  @media print { body { background: #fff; } main { margin: 0; border: none; border-radius: 0; padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
<main>
  <div class="header">
    <div>
      <h1>OgroniEdu</h1>
      <p class="muted">${isBn ? 'টিউশন পেমেন্ট ইনভয়েস' : 'Tuition payment invoice'}</p>
    </div>
    <div style="text-align:right">
      <div style="font-weight:800;font-size:18px">${escapeHtml(invoice.invoiceNumber)}</div>
      <div class="muted">${escapeHtml(invoice.status.toUpperCase())}</div>
    </div>
  </div>
  <table>
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td class="muted">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`,
      )
      .join('')}
    <tr class="total"><td>${isBn ? 'মোট পরিশোধিত' : 'Total paid'}</td><td>BDT ${escapeHtml(total)}</td></tr>
  </table>
  <p class="note">${
    isBn
      ? 'এই ইনভয়েসটি যাচাইকৃত পেমেন্টের পর স্বয়ংক্রিয়ভাবে তৈরি হয়েছে। প্ল্যাটফর্ম কমিশন ও শিক্ষকের প্রাপ্য শুধু হিসাবরক্ষণের জন্য দেখানো হয়েছে; ক্রেতার মোট পরিশোধিত অর্থ উপরের মোট।'
      : 'This invoice was generated automatically after a verified payment. Platform commission and tutor net are shown for accounting transparency; the amount paid by the customer is the total above.'
  }</p>
  <p class="note no-print">${isBn ? 'প্রিন্ট করতে Ctrl/Cmd + P চাপুন।' : 'Press Ctrl/Cmd + P to print.'}</p>
</main>
</body>
</html>`;
  }
}
