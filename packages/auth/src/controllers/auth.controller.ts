import {
  Controller,
  Post,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  Get, Body,
} from '@nestjs/common';
import { AuthService, TokenService } from '../services';
import {
  CurrentUser, CurrentUserInterface,
  Public,
} from '@loopstack/common';
import {
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HubAuthGuard } from '../guards/hub-auth.guard';
import { WorkerInfoDto } from '../dtos/worker-info.dto';
import { ApiResponse as SwaggerApiResponse } from '@nestjs/swagger/dist/decorators/api-response.decorator';
import { HubLoginRequestDto } from '../dtos/hub-login-request.dto';
import { HubLoginResponseDto } from '../dtos/hub-login-response.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { UserResponseDto } from '../dtos/user-response.dto';

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
    @CurrentUser() user: CurrentUserInterface,
  ): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user.userId);
  }

  @Public()
  @Get('worker/health')
  @SwaggerApiResponse({ type: WorkerInfoDto })
  @ApiExtraModels(WorkerInfoDto)
  getInfo(): WorkerInfoDto {
    return this.authService.getWorkerHealthInfo();
  }

  @Public()
  @Post('oauth/hub')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HubAuthGuard)
  @ApiOperation({ summary: 'Login via Hub' })
  @ApiBody({ type: HubLoginRequestDto })
  @ApiExtraModels(HubLoginRequestDto)
  @SwaggerApiResponse({ type: HubLoginResponseDto })
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  async hubLogin(
    @Body() hubLoginRequestDto: HubLoginRequestDto,
    @Request() req,
    @Response({ passthrough: true }) res,
  ): Promise<HubLoginResponseDto> {

    const tokens = await this.authService.login(req.user);

    this.setCookies(res, tokens);

    return { id: req.user.id, message: 'Login successful' };
  }
}