import {
  Controller,
  Post,
  Get,
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
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { BookingsService } from './bookings.service';
import {
  CreateBookingRequestDto,
  GetBookingRequestsQueryDto,
  RespondBookingRequestDto,
  WithdrawBookingRequestDto,
} from './dto';

@Controller('api/v1/requests')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(
    @Inject(BookingsService)
    private readonly bookingsService: BookingsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingRequestDto,
  ) {
    const booking = await this.bookingsService.createRequest(user, dto);
    return {
      success: true,
      message: 'Tutoring request submitted successfully.',
      data: booking,
    };
  }

  @Get()
  async getRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetBookingRequestsQueryDto,
  ) {
    const list = await this.bookingsService.getRequests(user, query);
    return {
      success: true,
      data: list,
    };
  }

  @Get(':id/history')
  async getStatusHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const events = await this.bookingsService.getStatusHistory(id, user);
    return { success: true, data: events };
  }

  @Get(':id')
  async getRequestById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const booking = await this.bookingsService.getRequestById(id, user);
    return {
      success: true,
      data: booking,
    };
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: WithdrawBookingRequestDto,
  ) {
    const booking = await this.bookingsService.withdrawRequest(id, user, dto);
    return {
      success: true,
      message: 'Tutoring request withdrawn successfully.',
      data: booking,
    };
  }

  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  async respondToRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondBookingRequestDto,
  ) {
    const booking = await this.bookingsService.respondToRequest(id, user, dto);
    return {
      success: true,
      message: `Tutoring request marked as '${booking.status}'.`,
      data: booking,
    };
  }
}
