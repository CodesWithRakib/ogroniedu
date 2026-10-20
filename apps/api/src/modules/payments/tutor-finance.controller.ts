import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PayoutsService } from './services/payouts.service';
import { RequestPayoutDto } from './dto';

/**
 * Tutor-facing finance: derived balances, settlement history and payout
 * requests. A tutor can only ever read their own records.
 */
@Controller('api/v1/tutor/finance')
@UseGuards(AuthGuard, RolesGuard)
@Roles('tutor')
export class TutorFinanceController {
  constructor(
    @Inject(PayoutsService)
    private readonly payoutsService: PayoutsService,
  ) {}

  @Get('summary')
  async getSummary(@CurrentUser() user: AuthenticatedUser) {
    const summary = await this.payoutsService.getTutorSummary(user);
    return { success: true, data: summary };
  }

  @Get('payouts')
  async listPayouts(@CurrentUser() user: AuthenticatedUser) {
    const payouts = await this.payoutsService.listMine(user);
    return { success: true, data: payouts };
  }

  @Post('payouts')
  @HttpCode(HttpStatus.CREATED)
  async requestPayout(@CurrentUser() user: AuthenticatedUser, @Body() dto: RequestPayoutDto) {
    const payout = await this.payoutsService.requestPayout(user, dto);
    return {
      success: true,
      message: 'Payout request submitted for finance review.',
      data: payout,
    };
  }

  @Get('payouts/:payoutId')
  async getPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ) {
    const payout = await this.payoutsService.getPayoutForTutor(user, payoutId);
    return { success: true, data: payout };
  }
}
