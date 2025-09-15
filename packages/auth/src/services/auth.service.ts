import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../repositories';
import { TokenService } from './token.service';
import { AuthConfig } from '../interfaces';
import { AUTH_CONFIG } from '../constants';
import {
  AuthResponseDto,
  User,
  UserResponseDto,
} from '@loopstack/shared';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_CONFIG) private config: AuthConfig,
    private userRepository: UserRepository,
    private tokenService: TokenService,
    private jwtService: JwtService,
  ) {}

  async login(user: any): Promise<AuthResponseDto> {
    const tokens = await this.tokenService.generateTokens(user);
    return {
      ...tokens,
      tokenType: 'Bearer',
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.jwt?.refreshSecret || this.config.jwt?.secret,
      });

      const user = await this.userRepository.findById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.tokenService.generateTokens(user);
      return {
        ...tokens,
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      isActive: user.isActive,
      roles: user.roles?.map(role => role.name) || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.mapUserToResponse(user);
  }

  getAuthStrategies() {
    return this.config.strategies;
  }

  getWorkerHealthInfo(): { clientId?: string; isConfigured: boolean } {
    return {
      clientId: this.config.clientId,
      isConfigured: !!this.config.clientSecret,
    };
  }
}
