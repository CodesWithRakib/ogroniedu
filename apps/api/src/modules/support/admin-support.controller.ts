import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SUPPORT_TRIAGE_ROLES } from '../../common/auth/role.utils';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { QuerySupportTicketsDto, UpdateSupportTicketDto } from './dto';
import { ok, paginated } from '../../common/api-response/api-response';
import { fromOffsetLimit } from '../../common/pagination/pagination.dto';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('api/v1/admin/support-tickets')
export class AdminSupportController {
  constructor(
    @Inject(SupportService)
    private readonly supportService: SupportService,
  ) {}

  @Get()
  @Roles(...SUPPORT_TRIAGE_ROLES)
  @ApiOperation({ summary: 'Staff triage queue for support tickets' })
  @ApiResponse({ status: 200, description: 'Paginated ticket queue' })
  async listTickets(@Query() query: QuerySupportTicketsDto) {
    const result = await this.supportService.listTickets(query);
    const { page, pageSize } = fromOffsetLimit({ offset: query.offset, limit: query.limit });
    return paginated(result.tickets, { page, pageSize, totalItems: result.total });
  }

  @Patch(':id')
  @Roles(...SUPPORT_TRIAGE_ROLES)
  @ApiOperation({ summary: 'Triage a support ticket (status + resolution notes)' })
  @ApiResponse({ status: 200, description: 'Updated ticket' })
  async updateTicket(
    @CurrentUser() staff: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    const ticket = await this.supportService.updateStatus(staff, ticketId, dto);
    return ok(ticket, `Support ticket marked as '${ticket.status}'.`);
  }
}
