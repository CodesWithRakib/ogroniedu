import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { GuardiansService, LinkedChildSummary } from './guardians.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GuardianStudentGuard } from '../../common/guards/guardian-student.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  LinkChildRequestDto,
  RegisterChildDto,
  VerifyLinkDto,
  RevokeLinkDto,
  SetChildPinDto,
} from './dto';

@Controller('api/v1/guardians')
@UseGuards(AuthGuard, RolesGuard)
export class GuardiansController {
  constructor(
    @Inject(GuardiansService)
    private readonly guardiansService: GuardiansService,
  ) {}

  @Post('children')
  @Roles('guardian', ...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async registerChild(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterChildDto,
  ): Promise<LinkedChildSummary> {
    return this.guardiansService.registerChild(user.id, dto);
  }

  @Post('children/link-request')
  @Roles('guardian', ...ADMIN_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async linkChildRequest(@CurrentUser() user: AuthenticatedUser, @Body() dto: LinkChildRequestDto) {
    return this.guardiansService.linkChildRequest(user.id, dto);
  }

  @Get('children')
  @Roles('guardian', ...ADMIN_ROLES)
  async getLinkedChildren(@CurrentUser() user: AuthenticatedUser): Promise<LinkedChildSummary[]> {
    return this.guardiansService.getLinkedChildren(user.id);
  }

  @Get('my-guardians')
  @Roles('student', ...ADMIN_ROLES)
  async getMyGuardians(@CurrentUser() user: AuthenticatedUser) {
    return this.guardiansService.getStudentGuardians(user.id);
  }

  @Get('children/:studentId')
  @UseGuards(GuardianStudentGuard)
  async getChildDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ): Promise<LinkedChildSummary> {
    return this.guardiansService.getChildDetails(user.id, studentId);
  }

  @Post('children/:linkId/verify')
  @Roles('student', ...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  async verifyLinkRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('linkId') linkId: string,
    @Body() dto: VerifyLinkDto,
  ) {
    return this.guardiansService.verifyLinkRequest(user.id, linkId, dto);
  }

  @Post('children/:studentId/magic-link')
  @Roles('guardian', ...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  async generateChildMagicLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Req() req: Request,
  ) {
    const origin = (req.headers['origin'] as string) || (req.headers['referer'] as string);
    return this.guardiansService.generateChildMagicLink(user.id, studentId, origin);
  }

  @Post('children/:studentId/pin')
  @Roles('guardian', ...ADMIN_ROLES)
  @HttpCode(HttpStatus.OK)
  async setChildPin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Body() dto: SetChildPinDto,
  ) {
    return this.guardiansService.setChildPin(user.id, studentId, dto);
  }

  @Delete('children/:studentId')
  @HttpCode(HttpStatus.OK)
  async revokeLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Body() dto: RevokeLinkDto,
  ) {
    return this.guardiansService.revokeLink(user.id, studentId, dto);
  }
}
