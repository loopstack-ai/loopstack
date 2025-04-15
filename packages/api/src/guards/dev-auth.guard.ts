import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DevAuthGuard extends AuthGuard('null') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context) {
    if (this.configService.get('ENABLE_NULL_USER')) {
      return super.canActivate(context);
    }

    return false;
  }
}
