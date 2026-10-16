import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  RequestCodeDto,
  VerifyCodeDto,
  ResetPasswordDto,
  RequestMagicLinkDto,
  ConsumeMagicLinkDto,
} from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ADMIN_ROLES } from '../../common/auth/role.utils';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  private setAuthCookies(res: Response, accessToken?: string, refreshToken?: string): void {
    const isProd = process.env.NODE_ENV === 'production';
    if (accessToken) {
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
        path: '/',
      });
    }
    if (refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }
  }

  private clearAuthCookies(res: Response): void {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });
    // Legacy path cleanup compat
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = {
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
    };

    const result = await this.authService.register(dto, meta);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = {
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
    };

    const result = await this.authService.login(dto, meta);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Cookie takes priority, fallback to body
    const token = req.cookies?.refresh_token || dto.refreshToken;
    const meta = {
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
    };

    const result = await this.authService.refresh(token, meta);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token || dto.refreshToken;
    const result = await this.authService.logout(token);
    this.clearAuthCookies(res);
    return result;
  }

  @Post('revoke-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.revokeAllSessions(user.id, 'user_requested');
    this.clearAuthCookies(res);
    return result;
  }

  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  async requestCode(@Body() dto: RequestCodeDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress;
    return this.authService.requestCode(dto, { ip });
  }

  @Post('magic-link/request')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body() dto: RequestMagicLinkDto, @Req() req: Request) {
    const meta = {
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
    };
    return this.authService.requestMagicLink(dto, meta);
  }

  @Post('magic-link/consume')
  @HttpCode(HttpStatus.OK)
  async consumeMagicLink(
    @Body() dto: ConsumeMagicLinkDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = {
      userAgent: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress,
    };
    const result = await this.authService.consumeMagicLink(dto, meta);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @Get('admin-only')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  async adminOnlyCheck(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Access granted to privileged admin endpoint',
      actor: user.id,
      roles: user.roles,
    };
  }
}
