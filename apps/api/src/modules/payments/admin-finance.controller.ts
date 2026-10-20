import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PayoutsService } from './services/payouts.service';
import { RefundsService } from './services/refunds.service';
import { SettlementService } from './services/settlement.service';
import { CommissionPolicyService } from './services/commission-policy.service';
import { LedgerService } from './ledger.service';
import {
  ConfirmManualRefundDto,
  DecideRefundDto,
  FinanceQueueQueryDto,
  MarkPayoutFailedDto,
  MarkPayoutPaidDto,
  RejectPayoutDto,
  UpdateCommissionPolicyDto,
} from './dto';

/**
 * Admin finance console. Every route is restricted to platform finance
 * operators (`admin`, `super_admin`); organization-scoped roles are denied
 * until a tenancy model exists.
 */
@Controller('api/v1/admin/finance')
@UseGuards(AuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
export class AdminFinanceController {
  constructor(
    @Inject(RefundsService)
    private readonly refundsService: RefundsService,
    @Inject(PayoutsService)
    private readonly payoutsService: PayoutsService,
    @Inject(SettlementService)
    private readonly settlementService: SettlementService,
    @Inject(CommissionPolicyService)
    private readonly commissionPolicyService: CommissionPolicyService,
    @Inject(LedgerService)
    private readonly ledgerService: LedgerService,
  ) {}

  // ---------------------------------------------------------------- refunds
  @Get('refunds')
  async listRefunds(@Query() query: FinanceQueueQueryDto) {
    return { success: true, data: await this.refundsService.listForFinance(query.status) };
  }

  @Post('refunds/:refundId/decide')
  @HttpCode(HttpStatus.OK)
  async decideRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('refundId', ParseUUIDPipe) refundId: string,
    @Body() dto: DecideRefundDto,
  ) {
    return { success: true, data: await this.refundsService.decide(user, refundId, dto) };
  }

  @Post('refunds/:refundId/process')
  @HttpCode(HttpStatus.OK)
  async processRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('refundId', ParseUUIDPipe) refundId: string,
  ) {
    const result = await this.refundsService.process(user, refundId);
    return {
      success: true,
      message: result.manualConfirmationRequired
        ? 'Automated refund is unavailable. Complete the transfer externally and record the reference.'
        : 'Refund processed.',
      data: result,
    };
  }

  @Post('refunds/:refundId/confirm-manual')
  @HttpCode(HttpStatus.OK)
  async confirmManualRefund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('refundId', ParseUUIDPipe) refundId: string,
    @Body() dto: ConfirmManualRefundDto,
  ) {
    return {
      success: true,
      data: await this.refundsService.confirmManual(user, refundId, dto),
    };
  }

  // ---------------------------------------------------------------- payouts
  @Get('payouts')
  async listPayouts(@Query() query: FinanceQueueQueryDto) {
    return { success: true, data: await this.payoutsService.listForFinance(query.status) };
  }

  @Post('payouts/:payoutId/approve')
  @HttpCode(HttpStatus.OK)
  async approvePayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ) {
    return { success: true, data: await this.payoutsService.approve(user, payoutId) };
  }

  @Post('payouts/:payoutId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
    @Body() dto: RejectPayoutDto,
  ) {
    return { success: true, data: await this.payoutsService.reject(user, payoutId, dto) };
  }

  @Post('payouts/:payoutId/mark-paid')
  @HttpCode(HttpStatus.OK)
  async markPayoutPaid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
    @Body() dto: MarkPayoutPaidDto,
  ) {
    return { success: true, data: await this.payoutsService.markPaid(user, payoutId, dto) };
  }

  @Post('payouts/:payoutId/mark-failed')
  @HttpCode(HttpStatus.OK)
  async markPayoutFailed(
    @CurrentUser() user: AuthenticatedUser,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
    @Body() dto: MarkPayoutFailedDto,
  ) {
    return { success: true, data: await this.payoutsService.markFailed(user, payoutId, dto) };
  }

  // ------------------------------------------------------- commission policy
  @Get('commission-policy')
  async listCommissionPolicies() {
    return { success: true, data: await this.commissionPolicyService.listVersions() };
  }

  @Post('commission-policy')
  @HttpCode(HttpStatus.CREATED)
  async createCommissionPolicy(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommissionPolicyDto,
  ) {
    return {
      success: true,
      message: 'A new commission policy version is now active.',
      data: await this.commissionPolicyService.createVersion(user, dto),
    };
  }

  // ----------------------------------------------------------- reconciliation
  @Post('reconciliation/run')
  @HttpCode(HttpStatus.OK)
  async runReconciliation(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.settlementService.runReconciliation(user) };
  }

  @Get('ledger/balance/:accountCode')
  async getLedgerBalance(@Param('accountCode') accountCode: string) {
    const balance = await this.ledgerService.getAccountBalance(accountCode);
    return {
      success: true,
      data: {
        accountCode,
        balancePoisha: balance.toString(),
      },
    };
  }

  @Get('ledger/reconciliation')
  async ledgerReconciliation() {
    return { success: true, data: await this.ledgerService.runReconciliation() };
  }
}
