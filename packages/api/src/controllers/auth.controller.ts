import {
  Controller,
  Post,
  UseGuards,
  Request,
  Response, HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import {
  ApiExtraModels, ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserDto } from '../dtos/user.dto';
import { DevAuthGuard } from '../guards/dev-auth.guard';

@ApiTags('api/v1/auth')
@ApiExtraModels(UserDto)
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(DevAuthGuard)
  @Post('login-dev')
  @ApiOperation({
    summary: 'Authenticate dev user',
    description: 'Login without credentials for development environments.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully authenticated',
    type: UserDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or authentication failed',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error occurred during authentication',
  })
  async login(
    @Request() req: { user: UserDto },
    @Response({ passthrough: true }) res: UserDto
  ): Promise<UserDto> {
    return this.authService.login(req.user, res);
  }
}
