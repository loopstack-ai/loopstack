import { Controller, Post, Body, UseGuards, Request, Response, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { AuthService, OAuthService } from '../services';
import { LocalAuthGuard, GoogleAuthGuard, DevAuthGuard } from '../guards';
import {
  AuthResponseDto,
  CurrentUser, DevLoginDto,
  LinkProviderDto,
  LoginDto,
  Public,
  RegisterDto,
  UserResponseDto,
} from '@loopstack/shared';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthService: OAuthService,
  ) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Response({ passthrough: true }) res, @Body() loginDto: LoginDto): Promise<{ message: string }> {
    const tokens = await this.authService.login(req.user);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expiresIn * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

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

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expiresIn * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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
  async googleCallback(@Request() req): Promise<AuthResponseDto> {
    return this.oauthService.handleOAuthLogin(req.user);
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
    return this.authService.getCurrentUser(user.userId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(DevAuthGuard)
  @Post('login-dev')
  async devLogin(@Request() req, @Response({ passthrough: true }) res): Promise<{ message: string }> {
    const tokens = await this.authService.login(req.user);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expiresIn * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { message: 'Login successful' };
  }
}