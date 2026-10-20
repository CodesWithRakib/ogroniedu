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
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SessionSeriesService } from './services/session-series.service';
import { SeriesCancelDto, SeriesRescheduleDto } from './dto';

@Controller('api/v1/session-series')
@UseGuards(AuthGuard)
export class SessionSeriesController {
  constructor(
    @Inject(SessionSeriesService)
    private readonly seriesService: SessionSeriesService,
  ) {}

  @Get(':id')
  async getSeries(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.seriesService.getSeries(id, user);
    return { success: true, data: result };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SeriesCancelDto,
  ) {
    const result = await this.seriesService.cancelSeries(id, user, dto);
    return {
      success: true,
      message: `Cancelled ${result.sessions.length} recurring occurrence(s).`,
      data: result,
    };
  }

  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  async rescheduleSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SeriesRescheduleDto,
  ) {
    const result = await this.seriesService.rescheduleSeries(id, user, dto);
    return {
      success: true,
      message: `Rescheduled ${result.sessions.length} recurring occurrence(s).`,
      data: result,
    };
  }
}
