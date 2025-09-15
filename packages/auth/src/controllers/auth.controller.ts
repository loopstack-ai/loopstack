import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService, TokenService } from '../services';
import {
  CurrentUser,
  Public,
  UserResponseDto,
} from '@loopstack/shared';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HubAuthGuard } from '../guards/hub-auth.guard';
import { HubLoginRequestDto } from '../dtos/hub-login-request.dto';

@ApiTags('api/v1/auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

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
  @ApiBody({ type: HubLoginRequestDto })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiExtraModels(HubLoginRequestDto)
  async hubLogin(
    @Body() hubLoginRequestDto: HubLoginRequestDto,
    @Request() req,
    @Response({ passthrough: true }) res,
  ): Promise<{ message: string }> {

    const tokens = await this.authService.login(req.user);

    res.cookie('accessToken', tokens.accessToken, this.tokenService.createAccessTokenCookieOptions());
    res.cookie('refreshToken', tokens.refreshToken, this.tokenService.createRefreshTokenCookieOptions());

    return { message: 'Login successful' };
  }
}