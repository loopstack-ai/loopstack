import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthConfig } from '../interfaces';
import { AUTH_CONFIG } from '../constants';
import { JwtPayloadInterface } from '@loopstack/shared';

@Injectable()
export class TokenService {
  constructor(
    @Inject(AUTH_CONFIG) private config: AuthConfig,
    private jwtService: JwtService,
  ) {}

  private getExpiresIn(): number {
    return this.getExpiresInSeconds(this.config.jwt?.expiresIn || '1h');
  }

  private getRefreshExpiresIn(): number {
    return this.getExpiresInSeconds(this.config.jwt?.refreshExpiresIn || '7h');
  }

  getCookieName(suffix: string) {
    return `${this.config.clientId}-${suffix}`;
  }

  createAccessTokenCookieOptions() {
    return {
      domain: this.config.jwt?.cookieDomain ?? undefined,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.getExpiresIn() * 1000,
    }
  }

  createRefreshTokenCookieOptions() {
    return {
      domain: this.config.jwt?.cookieDomain ?? undefined,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: this.getRefreshExpiresIn() * 1000,
    }
  }

  async generateTokens(user: any) {
    const payload: JwtPayloadInterface = {
      sub: user.id || null,
      email: user.email,
      roles: user.roles?.map(role => typeof role === 'string' ? role : role.name) || [],
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.config.jwt?.refreshSecret || this.config.jwt?.secret,
        expiresIn: this.config.jwt?.refreshExpiresIn || '7d',
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
}