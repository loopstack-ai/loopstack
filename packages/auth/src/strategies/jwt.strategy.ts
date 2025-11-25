import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Inject } from '@nestjs/common';
import { Request } from 'express';
import { AuthConfig } from '../interfaces';
import { AUTH_CONFIG } from '../constants';
import { JwtPayloadInterface } from '@loopstack/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(AUTH_CONFIG) config: AuthConfig,
  ) {
    const cookieName = `${config.clientId}-access`;
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJWTFromCookie(cookieName),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.jwt?.secret,
    });
  }

  private static extractJWTFromCookie(cookieName: string) {
    return (req: Request): string | null => {
      if (req.cookies && req.cookies[cookieName]) {
        return req.cookies[cookieName];
      }
      return null;
    }
  }

  async validate(payload: JwtPayloadInterface) {
    return {
      userId: payload.sub,
      type: payload.type,
      workerId: payload.workerId,
      roles: payload.roles,
    };
  }
}