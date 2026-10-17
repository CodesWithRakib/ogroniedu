import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentOrderEntity, PaymentOrderStatus } from '../entities';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { GuardianAccessService } from '../../guardians/guardian-access.service';
import { PaymentAdapterFactory } from '../adapters/adapter.factory';
import { AuditService } from '../../audit/audit.service';
import { CreatePaymentOrderDto } from '../dto';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { isAdminRole } from '../../../common/auth/role.utils';

export interface PaymentReceiptDto {
  receiptId: string;
  orderId: string;
  bookingId: string;
  payerName: string;
  studentName: string;
  tutorName: string;
  subjectName: string;
  amountBdt: string;
  amountMinor: number;
  currency: string;
  status: PaymentOrderStatus;
  paymentMethod: string;
  provider: string;
  paidAt: string;
}

/**
 * Payment order lifecycle: creation with idempotency protection plus
 * verifiable receipt generation. Does not handle webhooks, refunds,
 * or milestone settlement.
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
  ) {}

  /**
   * Helper: Check if user is authorized to act on this booking
   */
  private async assertCanPayForBooking(
    user: AuthenticatedUser,
    booking: BookingEntity,
  ): Promise<void> {
    if (isAdminRole(user)) {
      return;
    }

    if (user.id === booking.requesterUserId || user.id === booking.studentUserId) {
      return;
    }

    await this.guardianAccess.assertActiveLink(
      user.id,
      booking.studentUserId,
      'Access denied: Only the student, requester, or active linked guardian can pay for this booking',
    );
  }

  /**
   * 1. Create a Digital Payment Order with Idempotency Protection
   */
  async createPaymentOrder(
    user: AuthenticatedUser,
    dto: CreatePaymentOrderDto,
    idempotencyKey: string,
    requestId?: string,
  ): Promise<{
    orderId: string;
    checkoutUrl: string;
    amountMinor: number;
    currency: string;
    status: PaymentOrderStatus;
  }> {
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

    // Validate booking state
    if (booking.status === 'confirmed') {
      throw new BadRequestException('This booking has already been paid and confirmed');
    }
    if (booking.status !== 'accepted' && booking.status !== 'awaiting_payment') {
      throw new BadRequestException(
        `Booking status '${booking.status}' cannot accept payments. Must be accepted by tutor first.`,
      );
    }

    // Idempotency check: Replay existing order if same idempotency key
    const existingOrder = await this.orderRepo.findOne({
      where: {
        payerUserId: user.id,
        idempotencyKey,
      },
    });

    const providerName =
      dto.provider ||
      (dto.paymentMethod && ['bkash', 'nagad'].includes(dto.paymentMethod)
        ? dto.paymentMethod
        : 'sslcommerz');
    const adapter = this.adapterFactory.getAdapter(providerName);
    const amountMinor = Number(booking.pricePerSessionMinor);

    if (existingOrder) {
      if (
        existingOrder.bookingId !== dto.bookingId ||
        (dto.amountMinor && Number(existingOrder.amountMinor) !== Number(dto.amountMinor))
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
      );
      return {
        orderId: existingOrder.id,
        checkoutUrl: sessionResult.checkoutUrl,
        amountMinor: Number(existingOrder.amountMinor),
        currency: existingOrder.currency,
        status: existingOrder.status,
      };
    }

    // Create fresh payment order
    const order = this.orderRepo.create({
      bookingId: booking.id,
      payerUserId: user.id,
      amountMinor: amountMinor.toString(),
      currency: 'BDT',
      status: 'pending',
      idempotencyKey,
      provider: providerName,
    });

    const savedOrder = await this.orderRepo.save(order);

    // Call adapter to generate sandbox checkout session
    const sessionResult = await adapter.createCheckoutSession(
      savedOrder.id,
      amountMinor,
      'BDT',
      user.phone,
    );

    // Audit log
    await this.auditService.record({
      actorUserId: user.id,
      action: 'payment.order_created',
      resourceType: 'payment_orders',
      resourceId: savedOrder.id,
      requestId,
      safeMetadata: {
        bookingId: booking.id,
        amountMinor,
        currency: 'BDT',
        provider: providerName,
      },
    });

    return {
      orderId: savedOrder.id,
      checkoutUrl: sessionResult.checkoutUrl,
      amountMinor,
      currency: 'BDT',
      status: savedOrder.status,
    };
  }

  /**
   * 5. Generate Verifiable Payment Receipt
   */
  async getPaymentReceipt(user: AuthenticatedUser, orderId: string): Promise<PaymentReceiptDto> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        booking: { subject: true, studentUser: true, requesterUser: true },
        payerUser: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Payment order ${orderId} not found`);
    }

    if (
      user.id !== order.payerUserId &&
      user.id !== order.booking?.studentUserId &&
      user.id !== order.booking?.requesterUserId &&
      !isAdminRole(user)
    ) {
      throw new ForbiddenException('Access denied to payment receipt');
    }

    const amountBdt = (Number(order.amountMinor) / 100).toFixed(2);

    return {
      receiptId: `REC-${order.id.slice(0, 8).toUpperCase()}`,
      orderId: order.id,
      bookingId: order.bookingId,
      payerName: order.payerUser?.displayName || 'Valued Guardian/Student',
      studentName: order.booking?.studentUser?.displayName || 'Student',
      tutorName: 'Verified OgroniEdu Tutor',
      subjectName: order.booking?.subject?.nameEn || 'Tutoring Course',
      amountBdt,
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

  /**
   * List payment orders accessible to the current user (as payer, student, linked guardian, or admin)
   */
  async getMyPaymentOrders(user: AuthenticatedUser): Promise<PaymentOrderEntity[]> {
    if (isAdminRole(user)) {
      return await this.orderRepo.find({
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

    return await this.orderRepo
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
}
