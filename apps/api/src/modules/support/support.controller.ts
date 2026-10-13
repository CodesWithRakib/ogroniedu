import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto';
import { ok } from '../../common/api-response/api-response';

@ApiTags('Support Tickets')
@Controller('api/v1/support/tickets')
export class SupportController {
  constructor(
    @Inject(SupportService)
    private readonly supportService: SupportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a public contact/support ticket (guests welcome)' })
  @ApiResponse({ status: 201, description: 'Support ticket recorded for staff triage' })
  async submitTicket(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateSupportTicketDto,
  ) {
    const ticket = await this.supportService.createTicket(dto, user?.id ?? null);
    return ok(
      { id: ticket.id, status: ticket.status, createdAt: ticket.createdAt },
      'Your message has been received. Our support team will contact you by email.',
    );
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List own submitted support tickets (authenticated filers)' })
  @ApiResponse({ status: 200, description: 'Own ticket history' })
  async listMine(@CurrentUser() user: AuthenticatedUser) {
    const tickets = await this.supportService.listMine(user.id);
    return ok(tickets);
  }
}
