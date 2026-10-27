import type {
  PaymentReceiptDto,
  PaymentOrderStatusDto,
  CreatePaymentOrderResultDto,
} from '../interfaces/payment-orders.interfaces';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  ServiceUnavailableException,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrderEntity } from '../entities';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { PaymentAdapterFactory } from '../adapters/adapter.factory';
import { AuditService } from '../../audit/audit.service';
import { CommissionPolicyService } from './commission-policy.service';
import { InvoicesService } from './invoices.service';
import { CreatePaymentOrderDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';
import { minorToBdtString, parseMinor } from '../../../common/money/money';

export type {
  PaymentReceiptDto,
  PaymentOrderStatusDto,
  CreatePaymentOrderResultDto,
} from '../interfaces/payment-orders.interfaces';

/**
 * Payment order lifecycle: creation with idempotency protection plus
 * verifiable receipt generation. Amounts always come from the booking; the
 * commission rate is snapshotted from the active policy.
 */
@Injectable()
export class PaymentOrdersService {
  private readonly logger = new Logger(PaymentOrdersService.name);

  constructor(
    @InjectRepository(PaymentOrderEntity)
    private readonly orderRepo: Repository<PaymentOrderEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @Inject(GuardianAccessService)
    private readonly guardianAccess: GuardianAccessService,
    @Inject(PaymentAdapterFactory)
    private readonly adapterFactory: PaymentAdapterFactory,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
    @Inject(CommissionPolicyService)
    private readonly commissionPolicyService: CommissionPolicyService,
    @Optional()
    @Inject(InvoicesService)
    private readonly invoicesService?: InvoicesService,
  ) {}

  private async assertCanPayForBooking(
    user: AuthenticatedUser,
    booking: BookingEntity,
  ): Promise<void> {
    if (isAdminRole(user)) return;
    if (user.id === booking.requesterUserId || user.id === booking.studentUserId) return;

    await this.guardianAccess.assertActiveLink(
      user.id,
      booking.studentUserId,
      'Access denied: Only the student, requester, or active linked guardian can pay for this booking',
    );
  }

  async createPaymentOrder(
    user: AuthenticatedUser,
    dto: CreatePaymentOrderDto,
    idempotencyKey: string,
    requestId?: string,
  ): Promise<CreatePaymentOrderResultDto> {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.bookingId },
      relations: {
        studentUser: true,
        requesterUser: true,
        tutorProfile: true,
        subject: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    await this.assertCanPayForBooking(user, booking);

    if (booking.status === 'confirmed') {
      throw new BadRequestException('This booking has already been paid and confirmed');
    }
    if (booking.status !== 'accepted' && booking.status !== 'awaiting_payment') {
      throw new BadRequestException(
        `Booking status '${booking.status}' cannot accept payments. Must be accepted by tutor first.`,
      );
    }

    const amountMinor = parseMinor(booking.pricePerSessionMinor);
    if (amountMinor <= 0n) {
      throw new BadRequestException('Booking has no payable amount');
    }

    const existingOrder = await this.orderRepo.findOne({
      where: { payerUserId: user.id, idempotencyKey },
    });

    const providerName =
      dto.provider ||
      (dto.paymentMethod && ['bkash', 'nagad'].includes(dto.paymentMethod)
        ? dto.paymentMethod
        : 'sslcommerz');
    const adapter = this.adapterFactory.getAdapter(providerName);
    const sessionMetadata = { locale: dto.locale || 'bn', bookingId: booking.id };

    if (existingOrder) {
      if (
        existingOrder.bookingId !== dto.bookingId ||
        (dto.amountMinor && BigInt(existingOrder.amountMinor) !== parseMinor(dto.amountMinor))
      ) {
        throw new BadRequestException(
          'Idempotency key was already used for a different order or amount',
        );
      }
      this.logger.log(`Idempotent order returned for key ${idempotencyKey}`);
      const sessionResult = await adapter.createCheckoutSession(
        existingOrder.id,
        Number(existingOrder.amountMinor),
        existingOrder.currency,
        user.phone,
        sessionMetadata,
      );
      if (
        existingOrder.providerReference !== sessionResult.providerOrderId &&
        !existingOrder.providerReference
      ) {
        existingOrder.providerReference = sessionResult.providerOrderId;
        await this.orderRepo.save(existingOrder);
      }
      return {
        orderId: existingOrder.id,
        checkoutUrl: sessionResult.checkoutUrl,
        sessionKey: sessionResult.sessionKey,
        gatewayPageUrl: sessionResult.gatewayPageUrl,
        storeLogo: sessionResult.storeLogo,
        amountMinor: Number(existingOrder.amountMinor),
        currency: existingOrder.currency,
        status: existingOrder.status,
        commissionRateBps: existingOrder.commissionRateBps,
      };
    }

    // A booking can only be funded once. Partial secondary funding is not a
    // supported product flow yet (documented in REFUND_AND_PAYOUT_RULES.md).
    const alreadyPaid = await this.orderRepo.findOne({
      where: { bookingId: booking.id, status: 'succeeded' },
    });
    if (alreadyPaid) {
      throw new BadRequestException('This booking has already been funded');
    }

    const policy = await this.commissionPolicyService.getActivePolicy();

    const order = this.orderRepo.create({
      bookingId: booking.id,
      payerUserId: user.id,
      amountMinor: amountMinor.toString(),
      currency: booking.currency || 'BDT',
      status: 'pending',
      idempotencyKey,
      provider: providerName,
      commissionRateBps: policy.platformFeeBps,
      commissionPolicyId: policy.id,
    });

    const savedOrder = await this.orderRepo.save(order);

    let sessionResult: {
      checkoutUrl: string;
      providerOrderId: string;
      sessionKey?: string;
      gatewayPageUrl?: string;
      storeLogo?: string;
    };
    try {
      sessionResult = await adapter.createCheckoutSession(
        savedOrder.id,
        Number(amountMinor),
        savedOrder.currency,
        user.phone,
        sessionMetadata,
      );
    } catch (err) {
      // Mark the order as failed so it doesn't block future attempts
      savedOrder.status = 'failed';
      await this.orderRepo.save(savedOrder);

      this.logger.error(
        `Checkout session creation failed for order ${savedOrder.id}: ${err instanceof Error ? err.message : String(err)}`,
      );

      // Re-throw HttpExceptions (ServiceUnavailableException, etc.) as-is
      if (err instanceof HttpException) throw err;

      // Wrap unexpected errors so they don't leak internals
      throw new ServiceUnavailableException(
        'The payment gateway could not create a checkout session. Please try again later.',
      );
    }

    savedOrder.providerReference = sessionResult.providerOrderId;
    await this.orderRepo.save(savedOrder);

    await this.auditService.record({
      actorUserId: user.id,
      action: 'payment.order_created',
      resourceType: 'payment_orders',
      resourceId: savedOrder.id,
      requestId,
      safeMetadata: {
        bookingId: booking.id,
        amountMinor: amountMinor.toString(),
        currency: savedOrder.currency,
        provider: providerName,
        commissionRateBps: policy.platformFeeBps,
      },
    });

    return {
      orderId: savedOrder.id,
      checkoutUrl: sessionResult.checkoutUrl,
      sessionKey: sessionResult.sessionKey,
      gatewayPageUrl: sessionResult.gatewayPageUrl,
      storeLogo: sessionResult.storeLogo,
      amountMinor: Number(amountMinor),
      currency: savedOrder.currency,
      status: savedOrder.status,
      commissionRateBps: policy.platformFeeBps,
    };
  }

  async getPaymentReceipt(user: AuthenticatedUser, orderId: string): Promise<PaymentReceiptDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        booking: {
          subject: true,
          studentUser: true,
          requesterUser: true,
          tutorProfile: { user: true },
        },
        payerUser: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Payment order ${orderId} not found`);
    }

    const isLinkedGuardian =
      order.booking?.studentUserId &&
      (await this.guardianAccess.hasActiveLink(user.id, order.booking.studentUserId));

    if (
      user.id !== order.payerUserId &&
      user.id !== order.booking?.studentUserId &&
      user.id !== order.booking?.requesterUserId &&
      !isLinkedGuardian &&
      !isAdminRole(user)
    ) {
      throw new ForbiddenException('Access denied to payment receipt');
    }

    const invoice = this.invoicesService
      ? await this.invoicesService.getInvoiceForOrder(user, order.id)
      : null;

    return {
      receiptId: invoice?.invoiceNumber ?? `REC-${order.id.slice(0, 8).toUpperCase()}`,
      invoiceId: invoice?.id ?? null,
      invoiceNumber: invoice?.invoiceNumber ?? null,
      orderId: order.id,
      bookingId: order.bookingId,
      payerName: order.payerUser?.displayName ?? '—',
      studentName: order.booking?.studentUser?.displayName ?? '—',
      tutorName: order.booking?.tutorProfile?.user?.displayName ?? '—',
      subjectName: order.booking?.subject?.nameEn ?? '—',
      amountBdt: minorToBdtString(order.amountMinor),
      amountMinor: Number(order.amountMinor),
      currency: order.currency,
      status: order.status,
      paymentMethod: order.provider.toUpperCase(),
      provider: order.provider,
      paidAt: order.updatedAt.toISOString(),
    };
  }

  async getOrderById(orderId: string): Promise<PaymentOrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { booking: true },
    });
    if (!order) {
      throw new NotFoundException(`Payment order not found: ${orderId}`);
    }
    return order;
  }

  async getMyPaymentOrders(user: AuthenticatedUser): Promise<PaymentOrderEntity[]> {
    if (isAdminRole(user)) {
      return this.orderRepo.find({
        relations: {
          booking: {
            subject: true,
            studentUser: true,
            requesterUser: true,
            tutorProfile: { user: true },
          },
          payerUser: true,
          transactions: true,
          refunds: true,
        },
        order: { createdAt: 'DESC' },
      });
    }

    const childIds = await this.guardianAccess.findActiveStudentIds(user.id);
    const studentIds = [user.id, ...childIds];

    return this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.booking', 'booking')
      .leftJoinAndSelect('booking.subject', 'subject')
      .leftJoinAndSelect('booking.studentUser', 'student')
      .leftJoinAndSelect('booking.requesterUser', 'requester')
      .leftJoinAndSelect('booking.tutorProfile', 'tutorProfile')
      .leftJoinAndSelect('tutorProfile.user', 'tutorUser')
      .leftJoinAndSelect('order.payerUser', 'payerUser')
      .leftJoinAndSelect('order.transactions', 'transactions')
      .leftJoinAndSelect('order.refunds', 'refunds')
      .where('order.payerUserId = :userId', { userId: user.id })
      .orWhere('booking.studentUserId IN (:...studentIds)', { studentIds })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async getPaymentOrderStatus(
    user: AuthenticatedUser,
    orderId: string,
  ): Promise<PaymentOrderStatusDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        booking: {
          subject: true,
          studentUser: true,
          requesterUser: true,
          tutorProfile: { user: true },
        },
        payerUser: true,
        transactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Payment order ${orderId} not found`);
    }

    const isPayer = user.id === order.payerUserId;
    const isStudent = user.id === order.booking?.studentUserId;
    const isRequester = user.id === order.booking?.requesterUserId;
    const isLinkedGuardian =
      order.booking?.studentUserId &&
      (await this.guardianAccess.hasActiveLink(user.id, order.booking.studentUserId));

    if (!isPayer && !isStudent && !isRequester && !isLinkedGuardian && !isAdminRole(user)) {
      throw new ForbiddenException(
        'Access denied: You do not have permission to view this payment order status',
      );
    }

    const successfulTxn = order.transactions?.find((t) => t.status === 'succeeded');
    const failedTxn = order.transactions?.find((t) => t.status === 'failed');

    let receipt: PaymentReceiptDto | null = null;
    if (order.status === 'succeeded') {
      try {
        receipt = await this.getPaymentReceipt(user, orderId);
      } catch {
        receipt = null;
      }
    }

    const tutorUser = order.booking?.tutorProfile?.user;
    const tutorName = tutorUser?.displayName || tutorUser?.displayNameEn || 'Tutor';
    const studentUser = order.booking?.studentUser;
    const studentName = studentUser?.displayName || studentUser?.displayNameEn || 'Student';
    const subjectName =
      order.booking?.subject?.nameEn || order.booking?.subject?.nameBn || 'Subject';

    return {
      orderId: order.id,
      bookingId: order.bookingId,
      payerUserId: order.payerUserId,
      amountMinor: Number(order.amountMinor),
      currency: order.currency,
      status: order.status,
      provider: order.provider,
      providerReference: order.providerReference,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      verifiedAt: successfulTxn?.verifiedAt?.toISOString() || null,
      failureReason: (failedTxn?.rawPayloadRedacted?.rawStatus as string) || null,
      receipt,
      booking: order.booking
        ? {
            id: order.booking.id,
            subjectName,
            tutorName,
            studentName,
            rateMinor: Number(order.booking.pricePerSessionMinor) || 0,
            status: order.booking.status,
          }
        : undefined,
    };
  }
}
