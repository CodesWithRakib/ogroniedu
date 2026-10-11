import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Headers,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingMessagesService } from './booking-messages.service';
import { SendBookingMessageDto } from './dto/send-booking-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ok } from '../../common/api-response/api-response';

@ApiTags('Booking Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/bookings/:bookingId/messages')
export class BookingMessagesController {
  constructor(
    @Inject(BookingMessagesService)
    private readonly messagesService: BookingMessagesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Send participant-scoped message with content safety inspection' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: SendBookingMessageDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return ok(await this.messagesService.sendMessage(user, bookingId, dto, requestId));
  }

  @Get()
  @ApiOperation({ summary: 'Get message thread for authorized booking participants' })
  @ApiResponse({ status: 200, description: 'Cursor-paginated messages (oldest→newest)' })
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagesService.getMessages(user, bookingId, query);
  }

  @Patch(':messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(@CurrentUser() user: AuthenticatedUser, @Param('messageId') messageId: string) {
    return ok(await this.messagesService.markAsRead(user, messageId));
  }
}
