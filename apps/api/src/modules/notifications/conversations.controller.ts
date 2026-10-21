import { Controller, Get, Post, Param, Body, UseGuards, Headers, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingMessagesService } from './booking-messages.service';
import { SendBookingMessageDto } from './dto/send-booking-message.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ok } from '../../common/api-response/api-response';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/conversations')
export class ConversationsController {
  constructor(
    @Inject(BookingMessagesService)
    private readonly messagesService: BookingMessagesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get active conversation threads / inbox for authenticated user' })
  @ApiResponse({ status: 200, description: 'List of active conversation threads' })
  async getInbox(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.messagesService.getConversationsInbox(user));
  }

  @Post(':bookingId/messages')
  @ApiOperation({ summary: 'Send message to conversation thread' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: SendBookingMessageDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return ok(await this.messagesService.sendMessage(user, bookingId, dto, requestId));
  }

  @Post(':bookingId/read-all')
  @ApiOperation({ summary: 'Mark all unread messages in conversation as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
  ) {
    return ok(await this.messagesService.markAllInBookingAsRead(user, bookingId));
  }
}
