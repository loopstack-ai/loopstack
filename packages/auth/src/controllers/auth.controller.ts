import {
  Controller,
  Post,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService, TokenService } from '../services';
import {
  AuthResponseDto,
  CurrentUser,
  Public,
  UserResponseDto,
} from '@loopstack/shared';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HubAuthGuard } from '../guards/hub-auth.guard';

@ApiTags('api/v1/auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  private setCookies(res: any, tokens: AuthResponseDto) {
    res.cookie(this.tokenService.getCookieName('access'), tokens.accessToken, this.tokenService.createAccessTokenCookieOptions());
    res.cookie(this.tokenService.getCookieName('refresh'), tokens.refreshToken, this.tokenService.createRefreshTokenCookieOptions());
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Request() req, @Response({ passthrough: true }) res): Promise<{ message: string }> {
    const refreshTokenName = this.tokenService.getCookieName('refresh');
    const refreshToken = req.cookies?.[refreshTokenName];

    const tokens = await this.authService.refresh(refreshToken);

    this.setCookies(res, tokens);

    return { message: 'Token refreshed successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Response({ passthrough: true }) res): Promise<{ message: string }> {
    res.clearCookie(this.tokenService.getCookieName('access'));
    res.clearCookie(this.tokenService.getCookieName('refresh'));
    return { message: 'Logout successful' };
  }

  @Get('me')
  async me(
    @CurrentUser() user: any,
  ): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user.id);
  }

  @Public()
  @Get('worker/health')
  getInfo() {
    return this.authService.getWorkerHealthInfo();
  }

  @Public()
  @Post('oauth/hub')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HubAuthGuard)
  @ApiOperation({ summary: 'Login via Hub' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  async hubLogin(
    @Request() req,
    @Response({ passthrough: true }) res,
  ): Promise<{ message: string }> {

    const tokens = await this.authService.login(req.user);

    this.setCookies(res, tokens);

    return { message: 'Login successful' };
  }
}