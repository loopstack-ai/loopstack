import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { UserDto } from '../dtos/user.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([(req) => req?.cookies?.jwt]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'NO SECRET',
    });

    if (!process.env.JWT_SECRET) {
      this.logger.warn('No JWT Secret defined.')
    }
  }

  async validate(payload: any) {
    return new UserDto(payload.id);
  }
}
