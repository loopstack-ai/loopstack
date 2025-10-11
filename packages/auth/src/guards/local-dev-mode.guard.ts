import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { CurrentUserInterface } from '@loopstack/shared';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocalDevModeGuard implements CanActivate {

  constructor(private configService: ConfigService) {}


  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    request.user = {
      userId: this.configService.get<string>('auth.devUserId')!,
      workerId: 'local',
      roles: [],
    } satisfies CurrentUserInterface;

    return true;
  }
}