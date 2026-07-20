import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { API_TOKEN_PREFIX, CurrentUserInterface, IS_PUBLIC_KEY } from '@loopstack/common';
import { UserTypeEnum } from '@loopstack/common';
import { UserRepository } from '../repositories/index.js';
import { ApiTokenService } from '../services/api-token.service.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly apiTokenService: ApiTokenService,
    private readonly userRepository: UserRepository,
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

    const request = context.switchToHttp().getRequest<Request & { user?: CurrentUserInterface }>();
    const clientId = this.configService.get<string>('auth.clientId');
    const enableAuth = this.configService.get<boolean>('app.enableAuth');

    // personal access tokens — validated against the token store, not as JWTs
    const bearer = this.extractBearer(request);
    if (bearer?.startsWith(API_TOKEN_PREFIX)) {
      const user = await this.apiTokenService.validate(bearer);
      if (!user) {
        throw new UnauthorizedException('Invalid or expired API token');
      }
      request.user = user;
      return true;
    }

    // with auth disabled, credential-less requests resolve to the local dev
    // user — no login dance for local CLIs and scripts
    if (!enableAuth && !this.hasCredential(request, clientId)) {
      const localUser = await this.userRepository.findOrCreateLocalUser();
      request.user = {
        userId: localUser.id,
        type: localUser.type,
        workerId: clientId!,
        roles: localUser.roles?.map((role) => role.name) ?? [],
      };
      return true;
    }

    // jwt auth
    const result = await super.canActivate(context);
    if (!result) {
      return false;
    }

    const { user }: { user: CurrentUserInterface } = context.switchToHttp().getRequest();

    // when auth is disabled, only the local user type is allowed
    if (!enableAuth) {
      return user.type === UserTypeEnum.Local;
    }

    // ensure the authenticated user's worker ID matches the configured client ID.
    // This prevents authentication issues when multiple workers share the same URL
    // (e.g., localhost) but represent different clients. Without this check, a new worker
    // could authenticate using cookies from a previous worker session, leading to
    // cross-client authentication violations.
    return clientId === user.workerId;
  }

  private extractBearer(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    return header.slice('Bearer '.length);
  }

  private hasCredential(request: Request, clientId: string | undefined): boolean {
    const cookies = request.cookies as Record<string, string> | undefined;
    return Boolean(request.headers.authorization || (clientId && cookies?.[`${clientId}-access`]));
  }
}
