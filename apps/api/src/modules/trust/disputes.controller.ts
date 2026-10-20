import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, ResolveDisputeDto, QueryDisputesDto } from './dto';

@ApiTags('Trust & Booking Disputes')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/disputes')
export class DisputesController {
  constructor(
    @Inject(DisputesService)
    private readonly disputesService: DisputesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Open a formal booking dispute / complaint' })
  @ApiResponse({ status: 201, description: 'Dispute opened, booking placed into disputed status' })
  async openDispute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.openDispute(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List disputes (Admin triage queue or participant history)' })
  @ApiResponse({ status: 200, description: 'Paginated list of disputes' })
  async listDisputes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryDisputesDto,
  ) {
    return this.disputesService.listDisputes(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute details (ABAC Scoped)' })
  @ApiResponse({ status: 200, description: 'Dispute details with booking and resolution' })
  async getDispute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') disputeId: string,
  ) {
    return this.disputesService.getDispute(user, disputeId);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve dispute (Admin only: Refund, Uphold, Replacement, Dismiss)' })
  @ApiResponse({ status: 200, description: 'Dispute resolved and booking state updated' })
  async resolveDispute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolveDispute(user, disputeId, dto);
  }
}
