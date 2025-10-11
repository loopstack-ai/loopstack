import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayloadInterface } from '@loopstack/shared';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  private getExpiresIn(): number {
    return this.getExpiresInSeconds(this.configService.get('auth.jwt.expiresIn') || '1h');
  }

  private getRefreshExpiresIn(): number {
    return this.getExpiresInSeconds(this.configService.get('auth.jwt.refreshExpiresIn') || '7h');
  }

  getCookieName(suffix: string) {
    return `${this.configService.get('auth.clientId')}-${suffix}`;
  }

  createAccessTokenCookieOptions() {
    return {
      domain: this.configService.get('auth.jwt.cookieDomain') ?? undefined,
      httpOnly: true,
      secure: true, // process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: this.getExpiresIn() * 1000,
    }
  }

  createRefreshTokenCookieOptions() {
    return {
      domain: this.configService.get('auth.jwt.cookieDomain') ?? undefined,
      httpOnly: true,
      secure: true, // process.env.NODE_ENV === 'production',
      sameSite: 'None',
      maxAge: this.getRefreshExpiresIn() * 1000,
    }
  }

  private getRefreshSecret() {
    return this.configService.get<string>('auth.jwt.refreshSecret') ?? this.configService.get<string>('auth.jwt.secret');
  }

  async generateTokens(payload: JwtPayloadInterface) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiresIn(),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiresIn(),
    };
  }

  private getExpiresInSeconds(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      case 'm': return value * 60;
      case 's': return value;
      default: return 3600;
    }
  }

  verifyRefreshToken(refreshToken: string) {
    return this.jwtService.verify(refreshToken, {
      secret: this.getRefreshSecret(),
    });
  }
}