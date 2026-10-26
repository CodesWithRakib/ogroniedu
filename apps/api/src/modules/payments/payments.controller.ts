import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
  GoneException,
  Header,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { InvoicesService } from './services/invoices.service';
import { RefundsService } from './services/refunds.service';
import { RequestRefundDto, SettleMilestoneDto, CreatePaymentOrderDto } from './dto';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
    @Inject(InvoicesService)
    private readonly invoicesService: InvoicesService,
    @Inject(RefundsService)
    private readonly refundsService: RefundsService,
  ) {}

  @Post('orders')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPaymentOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentOrderDto,
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const key =
      idempotencyKeyHeader || `order-idem-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const result = await this.paymentsService.createPaymentOrder(user, dto, key, requestId);
    return {
      success: true,
      message: 'Payment order created successfully.',
      data: result,
    };
  }

  /**
   * Provider callback. The signature is verified against the exact raw request
   * body, so the raw buffer is passed through instead of the parsed object.
   */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string>,
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { rawBody?: Buffer },
    @Res({ passthrough: true }) res: Response,
    @Headers('x-request-id') requestId?: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8');
    const result = await this.paymentsService.handleWebhook(
      provider,
      headers,
      body,
      requestId,
      rawBody,
    );

    const isBrowserPost =
      headers['accept']?.includes('text/html') ||
      headers['sec-fetch-dest'] === 'document' ||
      headers['content-type']?.includes('application/x-www-form-urlencoded');

    if (isBrowserPost && res) {
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5000';
      return res.redirect(
        `${frontendUrl}/bn/dashboard/student/requests?payment=success&orderId=${result.orderId || ''}`,
      );
    }

    return {
      success: true,
      message: 'Webhook processed successfully.',
      data: result,
    };
  }

  @Post('refunds')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async requestRefund(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestRefundDto) {
    const refund = await this.refundsService.requestRefund(user, dto);
    return {
      success: true,
      message: 'Refund request submitted for finance review.',
      data: refund,
    };
  }

  @Get('refunds')
  @UseGuards(AuthGuard)
  async listMyRefunds(@CurrentUser() user: AuthenticatedUser) {
    const refunds = await this.refundsService.listMine(user);
    return { success: true, data: refunds };
  }

  @Get('refunds/:refundId')
  @UseGuards(AuthGuard)
  async getRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('refundId', ParseUUIDPipe) refundId: string,
  ) {
    const refund = await this.refundsService.getRefund(user, refundId);
    return { success: true, data: refund };
  }

  @Post('milestones/settle')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async settleMilestone(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SettleMilestoneDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const journal = await this.paymentsService.settleMilestone(user, dto, requestId);
    return {
      success: true,
      message: 'Session milestone settled into ledger successfully.',
      data: journal,
    };
  }

  @Post('orders/:orderId/sandbox-confirm')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.GONE)
  async sandboxConfirmOrder(): Promise<never> {
    // The client-triggerable sandbox confirmation path fabricated provider
    // success and bypassed the authoritative webhook. It is intentionally gone.
    throw new GoneException(
      'Sandbox payment confirmation was removed. Payment confirmation is only accepted from a verified provider webhook.',
    );
  }

  @Get('orders')
  @UseGuards(AuthGuard)
  async getMyPaymentOrders(@CurrentUser() user: AuthenticatedUser) {
    const orders = await this.paymentsService.getMyPaymentOrders(user);
    return {
      success: true,
      data: orders,
    };
  }

  @Get('orders/:orderId/receipt')
  @UseGuards(AuthGuard)
  async getPaymentReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    const receipt = await this.paymentsService.getPaymentReceipt(user, orderId);
    return {
      success: true,
      data: receipt,
    };
  }

  @Get('invoices/:invoiceId')
  @UseGuards(AuthGuard)
  async getInvoice(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId') invoiceId: string) {
    const invoice = await this.invoicesService.getInvoice(user, invoiceId);
    return { success: true, data: invoice };
  }

  /** Printable invoice HTML (no PDF renderer is bundled in this build). */
  @Get('invoices/:invoiceId/print')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'text/html; charset=utf-8')
  async printInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invoiceId') invoiceId: string,
    @Query('locale') locale?: string,
  ) {
    return this.invoicesService.renderInvoiceHtml(user, invoiceId, locale === 'bn' ? 'bn' : 'en');
  }
}
