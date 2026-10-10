import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type {
  NotificationsListResponseDto,
  UnreadCountResponseDto,
  MarkAsReadResponseDto,
  MarkAllAsReadResponseDto,
  NotificationItemDto,
} from '@ogroniedu/contracts';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  DispatchNotificationDto,
  GetNotificationsQueryDto,
  MarkAsReadParamDto,
  UpdateNotificationPreferencesDto,
} from './dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(
    @Inject(NotificationService)
    private readonly notificationService: NotificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications for current authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated notifications list' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<NotificationsListResponseDto> {
    return this.notificationService.getNotifications(user.id, {
      ...query,
      locale: query.locale || user.preferredLocale || 'bn',
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get current unread notification count for badge display' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<UnreadCountResponseDto> {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiResponse({ status: 200, description: 'Updated notification read state' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: MarkAsReadParamDto,
  ): Promise<MarkAsReadResponseDto> {
    return this.notificationService.markAsRead(user.id, params.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all unread notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'Count of marked notifications' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<MarkAllAsReadResponseDto> {
    return this.notificationService.markAllAsRead(user.id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user notification channel and category preferences' })
  @ApiResponse({ status: 200, description: 'List of user notification preferences' })
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user notification channel and category preferences' })
  @ApiResponse({ status: 200, description: 'Updated notification preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(user.id, dto);
  }

  @Post('test-dispatch')
  @ApiOperation({ summary: 'Trigger a notification dispatch (Internal / Testing)' })
  @ApiResponse({ status: 201, description: 'Dispatched notification item' })
  async testDispatch(@Body() dto: DispatchNotificationDto): Promise<NotificationItemDto> {
    return this.notificationService.dispatch(dto);
  }
}
