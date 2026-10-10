import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Query,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TutorsService } from './tutors.service';
import {
  UpdateTutorProfileDto,
  SetPublicationStatusDto,
  AddTutorQualificationDto,
  AddTutorSubjectDto,
  SetServiceAreasDto,
  SetAvailabilityDto,
  SearchTutorsQueryDto,
} from './dto';

@Controller('api/v1/tutors')
export class TutorsController {
  constructor(
    @Inject(TutorsService)
    private readonly tutorsService: TutorsService,
  ) {}

  // --------------------------------------------------------------------------
  // Public Endpoints: Search & Public Profile
  // --------------------------------------------------------------------------

  @Get('search')
  async searchTutors(@Query() query: SearchTutorsQueryDto) {
    const results = await this.tutorsService.searchTutors(query);
    return {
      success: true,
      ...results,
    };
  }

  @Get('public/:id')
  async getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    const profile = await this.tutorsService.getPublicProfile(id);
    return {
      success: true,
      data: profile,
    };
  }

  // --------------------------------------------------------------------------
  // Authenticated Tutor Endpoints
  // --------------------------------------------------------------------------

  @Get('me')
  @UseGuards(AuthGuard)
  async getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.tutorsService.getOwnProfile(user.id);
    return {
      success: true,
      data,
    };
  }

  @Put('me/profile')
  @UseGuards(AuthGuard)
  async updateOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTutorProfileDto,
  ) {
    const profile = await this.tutorsService.updateOwnProfile(user.id, dto);
    return {
      success: true,
      data: profile,
    };
  }

  @Post('me/submit-verification')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitVerification(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.tutorsService.submitVerification(user.id);
    return {
      success: true,
      message: 'Profile successfully submitted for verification review.',
      data: profile,
    };
  }

  @Patch('me/publication')
  @UseGuards(AuthGuard)
  async setPublicationStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetPublicationStatusDto,
  ) {
    const profile = await this.tutorsService.setPublicationStatus(user.id, dto.publicationStatus);
    return {
      success: true,
      data: profile,
    };
  }

  @Post('me/qualifications')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addQualification(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddTutorQualificationDto,
  ) {
    const qualification = await this.tutorsService.addQualification(user.id, dto);
    return {
      success: true,
      data: qualification,
    };
  }

  @Delete('me/qualifications/:id')
  @UseGuards(AuthGuard)
  async deleteQualification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tutorsService.deleteQualification(user.id, id);
    return {
      success: true,
      message: 'Qualification removed successfully.',
    };
  }

  @Post('me/subjects')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addSubject(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddTutorSubjectDto) {
    const subject = await this.tutorsService.addSubject(user.id, dto);
    return {
      success: true,
      data: subject,
    };
  }

  @Delete('me/subjects/:id')
  @UseGuards(AuthGuard)
  async deleteSubject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tutorsService.deleteSubject(user.id, id);
    return {
      success: true,
      message: 'Teaching subject removed successfully.',
    };
  }

  @Put('me/service-areas')
  @UseGuards(AuthGuard)
  async setServiceAreas(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetServiceAreasDto) {
    const areas = await this.tutorsService.setServiceAreas(user.id, dto.areas);
    return {
      success: true,
      data: areas,
    };
  }

  @Put('me/availability')
  @UseGuards(AuthGuard)
  async setAvailability(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetAvailabilityDto) {
    const slots = await this.tutorsService.setAvailability(user.id, dto.slots);
    return {
      success: true,
      data: slots,
    };
  }
}
