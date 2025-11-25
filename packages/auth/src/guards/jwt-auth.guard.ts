import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUserInterface, IS_PUBLIC_KEY } from '@loopstack/common';
import { ConfigService } from '@nestjs/config';
import { UserTypeEnum } from '@loopstack/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    // skip jwt auth for public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // jwt auth
    const result = await super.canActivate(context);
    if (!result) {
      return false;
    }

    const { user }: { user: CurrentUserInterface } = context.switchToHttp().getRequest();

    // in local mode, only the local user type is allowed
    const isLocalDevMode = this.configService.get<boolean>('app.isLocalMode');
    if (isLocalDevMode) {
      return user.type === UserTypeEnum.Local;
    }

    // ensure the authenticated user's worker ID matches the configured client ID.
    // This prevents authentication issues when multiple workers share the same URL
    // (e.g., localhost) but represent different clients. Without this check, a new worker
    // could authenticate using cookies from a previous worker session, leading to
    // cross-client authentication violations.
    const clientId = this.configService.get<string>('auth.clientId');
    return clientId === user.workerId;
  }
}
