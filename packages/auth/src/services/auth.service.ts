import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayloadInterface, User, assertResponse } from '@loopstack/common';
import { AuthUserInterface, AuthUserSchema, WorkerInfoInterface, WorkerInfoSchema } from '@loopstack/contracts/api';
import { AuthResponseDto } from '../dtos/auth-response.dto.js';
import { UserRepository } from '../repositories/index.js';
import { TokenService } from './token.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private userRepository: UserRepository,
    private tokenService: TokenService,
  ) {}

  async login(user: User): Promise<AuthResponseDto> {
    const workerId = this.configService.get<string>('auth.clientId') ?? '';
    const payload: JwtPayloadInterface = {
      sub: user.id,
      type: user.type,
      roles: user.roles?.map((role) => role.name) || [],
      workerId,
    };

    const tokens = await this.tokenService.generateTokens(payload);
    return {
      ...tokens,
      tokenType: 'Bearer',
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);

      const user = await this.userRepository.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // roles might have changed
      const newPayload = {
        sub: payload.sub,
        type: payload.type,
        workerId: payload.workerId,
        roles: user.roles?.map((role) => role.name) || [],
      };

      const tokens = await this.tokenService.generateTokens(newPayload);
      return {
        ...tokens,
        tokenType: 'Bearer',
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  mapUserToResponse(user: User): AuthUserInterface {
    return assertResponse(AuthUserSchema, {
      id: user.id,
      isActive: user.isActive,
      roles: user.roles?.map((role) => role.name) || [],
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  }

  async getCurrentUser(userId: string): Promise<AuthUserInterface> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.mapUserToResponse(user);
  }

  getWorkerHealthInfo(): WorkerInfoInterface {
    const enableAuth = this.configService.get<boolean>('app.enableAuth');
    return assertResponse(WorkerInfoSchema, {
      clientId: enableAuth ? this.configService.get<string>('auth.clientId') : 'local',
      isConfigured: !enableAuth || !!this.configService.get<string>('auth.hub.jwksUri'),
      timestamp: new Date().toISOString(),
    });
  }
}
