import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../repositories';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuthConfig } from '../interfaces';
import { AUTH_CONFIG } from '../constants';
import { AuthResponseDto, RegisterDto, User, UserResponseDto } from '@loopstack/shared';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_CONFIG) private config: AuthConfig,
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findByEmail(email);
    if (user && await this.passwordService.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any): Promise<AuthResponseDto> {
    const tokens = await this.tokenService.generateTokens(user);
    return {
      ...tokens,
      tokenType: 'Bearer',
    };
  }

  async register(registerDto: RegisterDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.passwordService.hash(registerDto.password);
    const user = await this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    return this.mapUserToResponse(user);
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
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
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

}