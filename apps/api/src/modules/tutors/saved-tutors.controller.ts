import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SavedTutorsService } from './services/saved-tutors.service';

@Controller('api/v1/saved-tutors')
@UseGuards(AuthGuard)
export class SavedTutorsController {
  constructor(private readonly savedTutorsService: SavedTutorsService) {}

  /** Own list only — the user id always comes from the authenticated session. */
  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.savedTutorsService.list(user.id),
    };
  }

  @Post(':tutorUserId')
  @HttpCode(HttpStatus.CREATED)
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tutorUserId', ParseUUIDPipe) tutorUserId: string,
  ) {
    return {
      success: true,
      data: await this.savedTutorsService.save(user.id, tutorUserId),
    };
  }

  @Delete(':tutorUserId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tutorUserId', ParseUUIDPipe) tutorUserId: string,
  ) {
    return {
      success: true,
      data: await this.savedTutorsService.remove(user.id, tutorUserId),
    };
  }
}
