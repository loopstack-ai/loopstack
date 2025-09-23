import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { UserRepository } from '../repositories';
import { TokenService } from './token.service';
import {
  AuthResponseDto, JwtPayloadInterface,
  User,
  UserResponseDto,
} from '@loopstack/shared';
import { WorkerInfoDto } from '../dtos/worker-info.dto';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private userRepository: UserRepository,
    private tokenService: TokenService,
  ) {}

  async login(user: User): Promise<AuthResponseDto> {
    const workerId = this.configService.get('auth.clientId');
    const payload: JwtPayloadInterface = {
      sub: user.id,
      roles: user.roles?.map(role => role.name) || [],
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
        workerId: payload.workerId,
        roles: user.roles?.map(role => role.name) || [],
      }

      const tokens = await this.tokenService.generateTokens(newPayload);
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

  getWorkerHealthInfo(): WorkerInfoDto {
    return plainToInstance(WorkerInfoDto, {
      clientId: this.configService.get<string>('auth.clientId'),
      isConfigured: !!this.configService.get<string>('auth.clientSecret'),
    }, {
      excludeExtraneousValues: true,
    });
  }
}
