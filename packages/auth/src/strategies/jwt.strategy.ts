import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserInterface, JwtPayloadInterface } from '@loopstack/common';
import { AuthConfig } from '../interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const config = configService.getOrThrow<AuthConfig>('auth');
    const cookieName = `${config.clientId}-access`;
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJWTFromCookie(cookieName),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.jwt?.secret ?? '',
    });
  }

  private static extractJWTFromCookie(cookieName: string) {
    return (req: Request): string | null => {
      const cookies = req.cookies as Record<string, string> | undefined;
      if (cookies && cookies[cookieName]) {
        return cookies[cookieName];
      }
      return null;
    };
  }

  validate(payload: JwtPayloadInterface): CurrentUserInterface {
    return {
      userId: payload.sub,
      type: payload.type,
      workerId: payload.workerId,
      roles: payload.roles,
    };
  }
}
