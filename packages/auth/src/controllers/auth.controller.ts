import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser, CurrentUserInterface, Public, User } from '@loopstack/common';
import { AuthResponseDto } from '../dtos/auth-response.dto.js';
import { HubLoginRequestDto } from '../dtos/hub-login-request.dto.js';
import { HubLoginResponseDto } from '../dtos/hub-login-response.dto.js';
import { UserResponseDto } from '../dtos/user-response.dto.js';
import { WorkerInfoDto } from '../dtos/worker-info.dto.js';
import { HubAuthGuard } from '../guards/hub-auth.guard.js';
import { AuthService, TokenService } from '../services/index.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  private setCookies(res: Response, tokens: AuthResponseDto): void {
    res.cookie(
      this.tokenService.getCookieName('access'),
      tokens.accessToken,
      this.tokenService.createAccessTokenCookieOptions(),
    );
    res.cookie(
      this.tokenService.getCookieName('refresh'),
      tokens.refreshToken,
      this.tokenService.createRefreshTokenCookieOptions(),
    );
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    const refreshTokenName = this.tokenService.getCookieName('refresh');
    const refreshToken = (req.cookies as Record<string, string>)?.[refreshTokenName] ?? '';

    const tokens = await this.authService.refresh(refreshToken);

    this.setCookies(res, tokens);

    return { message: 'Token refreshed successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie(this.tokenService.getCookieName('access'));
    res.clearCookie(this.tokenService.getCookieName('refresh'));
    return { message: 'Logout successful' };
  }

  @Get('me')
  async me(@CurrentUser() user: CurrentUserInterface): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user.userId);
  }

  @Public()
  @Get('worker/health')
  getInfo(): WorkerInfoDto {
    return this.authService.getWorkerHealthInfo();
  }

  @Public()
  @Post('oauth/hub')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HubAuthGuard)
  async hubLogin(
    @Body() _hubLoginRequestDto: HubLoginRequestDto,
    @Req() req: Request & { user: User },
    @Res({ passthrough: true }) res: Response,
  ): Promise<HubLoginResponseDto> {
    const tokens = await this.authService.login(req.user);

    this.setCookies(res, tokens);

    return { id: req.user.id, message: 'Login successful' };
  }
}
