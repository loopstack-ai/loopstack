import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalDevModeGuard } from './local-dev-mode.guard';

@Injectable()
export class ConditionalAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly localDevModeGuard: LocalDevModeGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isLocalDevMode = this.configService.get<boolean>('app.isLocalMode');

    if (isLocalDevMode) {
      return this.localDevModeGuard.canActivate(context);
    }

    return this.jwtAuthGuard.canActivate(context);
  }
}