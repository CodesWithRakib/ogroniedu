import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingMessagesService } from './booking-messages.service';
import { SendBookingMessageDto } from './dto/send-booking-message.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Booking Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/bookings/:bookingId/messages')
export class BookingMessagesController {
  constructor(private readonly messagesService: BookingMessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send participant-scoped message with content safety inspection' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: SendBookingMessageDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.messagesService.sendMessage(user, bookingId, dto, requestId);
  }

  @Get()
  @ApiOperation({ summary: 'Get message thread for authorized booking participants' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.messagesService.getMessages(user, bookingId);
  }

  @Patch(':messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('messageId') messageId: string,
  ) {
    return this.messagesService.markAsRead(user, messageId);
  }
}
