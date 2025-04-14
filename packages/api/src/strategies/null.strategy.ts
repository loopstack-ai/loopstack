import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserDto } from '../dtos/user.dto';
import { Strategy } from 'passport-custom';

@Injectable()
export class NullStrategy extends PassportStrategy(Strategy, 'null') {
  constructor() {
    super();
  }

  async validate(): Promise<UserDto> {
    return new UserDto();
  }
}
