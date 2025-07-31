import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-custom';

@Injectable()
export class DevStrategy extends PassportStrategy(Strategy, 'dev') {
  constructor() {
    super();
  }

  async validate(req: Request): Promise<any> {
    return {
      id: null,
      email: 'dev@localhost',
      firstName: 'Dev',
      lastName: 'User',
      roles: [],
      isActive: true,
    };
  }
}