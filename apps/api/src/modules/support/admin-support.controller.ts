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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { QuerySupportTicketsDto, UpdateSupportTicketDto } from './dto';
import { ok, paginated } from '../../common/api-response/api-response';

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
  @Roles('admin', 'super_admin', 'support_agent')
  @ApiOperation({ summary: 'Staff triage queue for support tickets' })
  @ApiResponse({ status: 200, description: 'Paginated ticket queue' })
  async listTickets(@Query() query: QuerySupportTicketsDto) {
    const result = await this.supportService.listTickets(query);
    const pageSize = query.limit ?? 20;
    const page = pageSize > 0 ? Math.floor((query.offset ?? 0) / pageSize) + 1 : 1;
    return paginated(result.tickets, { page, pageSize, totalItems: result.total });
  }

  @Patch(':id')
  @Roles('admin', 'super_admin', 'support_agent')
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
