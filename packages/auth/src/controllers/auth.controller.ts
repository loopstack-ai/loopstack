import { Controller, Post, Body, UseGuards, Request, Response, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { AuthService, OAuthService, TokenService } from '../services';
import { LocalAuthGuard, GoogleAuthGuard, DevAuthGuard } from '../guards';
import {
  CurrentUser,
  LinkProviderDto,
  LoginDto,
  Public,
  RegisterDto,
  UserResponseDto,
} from '@loopstack/shared';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('api/v1/auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly oauthService: OAuthService,
  ) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Response({ passthrough: true }) res, @Body() loginDto: LoginDto): Promise<{ message: string }> {
    const tokens = await this.authService.login(req.user);

    res.cookie('accessToken', tokens.accessToken, this.tokenService.createAccessTokenCookieOptions());
    res.cookie('refreshToken', tokens.refreshToken, this.tokenService.createRefreshTokenCookieOptions());

    return { message: 'Login successful' };
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(registerDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Request() req, @Response({ passthrough: true }) res): Promise<{ message: string }> {
    const refreshToken = req.cookies?.refreshToken;
    const tokens = await this.authService.refresh(refreshToken);

    res.cookie('accessToken', tokens.accessToken, this.tokenService.createAccessTokenCookieOptions());
    res.cookie('refreshToken', tokens.refreshToken, this.tokenService.createRefreshTokenCookieOptions());

    return { message: 'Token refreshed successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Response({ passthrough: true }) res): Promise<{ message: string }> {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { message: 'Logout successful' };
  }

  @Public()
  @Get('oauth/google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('oauth/google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Request() req, @Response({ passthrough: true }) res): Promise<{ message: string }>  {
    const tokens = await this.oauthService.handleOAuthLogin(req.user);

    res.cookie('accessToken', tokens.accessToken, this.tokenService.createAccessTokenCookieOptions());
    res.cookie('refreshToken', tokens.refreshToken, this.tokenService.createRefreshTokenCookieOptions());

    return { message: 'Login successful' };
  }

  @Post('link-provider')
  async linkProvider(
    @CurrentUser() user: any,
    @Body() linkProviderDto: LinkProviderDto,
  ): Promise<UserResponseDto> {
    return this.oauthService.linkProvider(user.userId, linkProviderDto);
  }

  @Get('providers')
  async getProviders(@CurrentUser() user: any): Promise<string[]> {
    return this.oauthService.getUserProviders(user.userId);
  }

  @Get('me')
  async me(@CurrentUser() user: any): Promise<UserResponseDto> {
    if (
      !user.userId &&
      user.email === 'dev@localhost' &&
      this.authService.getAuthStrategies().includes(AuthStrategy.DEV)
    ) {
      return {
        id: 'dev-user-id',
        email: 'dev@localhost',
        firstName: 'Dev',
        lastName: 'User',
        isActive: true,
        roles: ['dev'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return this.authService.getCurrentUser(user.userId);
  }
  @Public()
  @Get('auth-strategies')
  async getAuthStrategies(): Promise<string[]> {
    return this.authService.getAuthStrategies();
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(DevAuthGuard)
  @Post('login-dev')
  async devLogin(@Request() req, @Response({ passthrough: true }) res): Promise<{ message: string }> {
    const tokens = await this.authService.login(req.user);

    res.cookie('accessToken', tokens.accessToken, this.tokenService.createAccessTokenCookieOptions());
    res.cookie('refreshToken', tokens.refreshToken, this.tokenService.createRefreshTokenCookieOptions());

    return { message: 'Login successful' };
  }
}