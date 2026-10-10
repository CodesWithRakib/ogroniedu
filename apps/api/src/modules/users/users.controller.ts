import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { UsersService, UserProfileResponse } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto, UpsertStudentProfileDto, DeleteAccountDto } from './dto';

@Controller('api/v1/users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileResponse> {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('me/student-profile')
  async updateStudentProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertStudentProfileDto,
  ) {
    return this.usersService.upsertStudentProfile(user.id, dto);
  }

  @Get('me/export')
  async exportMyData(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.exportUserData(user.id);
  }

  @Post('me/delete-account')
  @HttpCode(HttpStatus.OK)
  async deleteMyAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(user.id, dto.reason);
  }
}
