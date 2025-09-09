import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-custom';
import { DEV_USER_CONFIG } from '../constants/dev-user.constants';

@Injectable()
export class DevStrategy extends PassportStrategy(Strategy, 'dev') {
  constructor() {
    super();
  }

  async validate(req: Request): Promise<any> {
    return DEV_USER_CONFIG;
  }
}
