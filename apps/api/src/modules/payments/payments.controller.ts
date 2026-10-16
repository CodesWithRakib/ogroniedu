import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { LedgerService } from './ledger.service';
import {
  CreatePaymentOrderDto,
  PaymentWebhookDto,
  ProcessRefundDto,
  SettleMilestoneDto,
} from './dto';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
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

  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string>,
    @Body() body: PaymentWebhookDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const result = await this.paymentsService.handleWebhook(provider, headers, body, requestId);
    return {
      success: true,
      message: 'Webhook processed successfully.',
      data: result,
    };
  }

  @Post('refunds')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProcessRefundDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const refund = await this.paymentsService.processRefund(user, dto, requestId);
    return {
      success: true,
      message: 'Refund processed successfully.',
      data: refund,
    };
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
  @HttpCode(HttpStatus.OK)
  async sandboxConfirmOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body?: { provider?: string },
    @Headers('x-request-id') requestId?: string,
  ) {
    const result = await this.paymentsService.sandboxConfirmOrder(
      user,
      orderId,
      body?.provider,
      requestId,
    );
    return {
      success: true,
      message: 'Sandbox payment verified and processed successfully.',
      data: result,
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

  @Get('reconciliation')
  @UseGuards(AuthGuard)
  async runReconciliation() {
    const report = await this.paymentsService.runReconciliation();
    return {
      success: true,
      data: report,
    };
  }

  @Get('ledger/balance/:accountCode')
  @UseGuards(AuthGuard)
  async getLedgerBalance(@Param('accountCode') accountCode: string) {
    const balance = await this.ledgerService.getAccountBalance(accountCode);
    return {
      success: true,
      data: {
        accountCode,
        balancePoisha: balance.toString(),
        balanceBdt: (Number(balance) / 100).toFixed(2),
      },
    };
  }
}
