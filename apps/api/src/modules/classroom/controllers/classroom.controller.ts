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
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { ClassroomService } from '../services/classroom.service';
import {
  JoinClassroomDto,
  RaiseHandDto,
  PromoteParticipantDto,
  MuteParticipantDto,
  KickParticipantDto,
  EndClassroomDto,
} from '../dto';

@Controller('api/v1/classroom')
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Get('sessions/:id')
  @UseGuards(AuthGuard)
  async getClassroomSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const { classroom, bookingSession, userRole } =
      await this.classroomService.getOrCreateClassroomForSession(id, user);

    return {
      success: true,
      data: {
        id: classroom.id,
        sessionId: id,
        roomName: classroom.roomName,
        title: classroom.title,
        mode: classroom.mode,
        status: classroom.status,
        maxParticipants: classroom.maxParticipants,
        userRole,
        startsAt: bookingSession.startsAt,
        endsAt: bookingSession.endsAt,
        isTutor: userRole === 'HOST',
        bookingSessionStatus: bookingSession.status,
      },
    };
  }

  @Post('sessions/:id/join')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async joinClassroom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: JoinClassroomDto,
  ) {
    const joinPayload = await this.classroomService.joinClassroom(id, user, dto.deviceInfo);
    return {
      success: true,
      message: 'Access token generated for live classroom.',
      data: joinPayload,
    };
  }

  @Post('sessions/:id/hand-raise')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async raiseHand(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RaiseHandDto,
  ) {
    await this.classroomService.raiseHand(id, user, dto.isHandRaised);
    return {
      success: true,
      message: dto.isHandRaised ? 'Hand raised successfully.' : 'Hand lowered.',
      data: { isHandRaised: dto.isHandRaised },
    };
  }

  @Post('sessions/:id/promote')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async promoteParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PromoteParticipantDto,
  ) {
    await this.classroomService.promoteParticipant(
      id,
      user,
      dto.participantIdentity,
      dto.canPublish,
    );
    return {
      success: true,
      message: dto.canPublish
        ? 'Participant promoted to stage with publishing rights.'
        : 'Participant publishing permissions revoked.',
      data: {
        participantIdentity: dto.participantIdentity,
        canPublish: dto.canPublish,
      },
    };
  }

  @Post('sessions/:id/mute')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async muteParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MuteParticipantDto,
  ) {
    await this.classroomService.muteParticipant(
      id,
      user,
      dto.participantIdentity,
      dto.trackSid,
      dto.muted,
    );
    return {
      success: true,
      message: 'Participant muted successfully.',
    };
  }

  @Post('sessions/:id/kick')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async kickParticipant(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KickParticipantDto,
  ) {
    await this.classroomService.kickParticipant(
      id,
      user,
      dto.participantIdentity,
      dto.reason,
    );
    return {
      success: true,
      message: 'Participant removed from classroom.',
    };
  }

  @Post('sessions/:id/end')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async endClassroom(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndClassroomDto,
  ) {
    await this.classroomService.endClassroom(id, user, dto.notes);
    return {
      success: true,
      message: 'Classroom session ended successfully and attendance finalized.',
    };
  }

  @Get('sessions/:id/attendees')
  @UseGuards(AuthGuard)
  async getAttendees(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const attendees = await this.classroomService.getAttendees(id, user);
    return {
      success: true,
      data: attendees,
    };
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('authorization') authHeader?: string,
  ) {
    if (!authHeader) {
      throw new BadRequestException('Missing authorization header for webhook.');
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    const result = await this.classroomService.handleWebhook(rawBody, authHeader);
    return {
      success: true,
      data: result,
    };
  }
}
