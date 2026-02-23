import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from 'jose';
import { Strategy } from 'passport-custom';
import { UserTypeEnum } from '@loopstack/common';
import { User } from '@loopstack/common';
import { UserRepository } from '../repositories';

@Injectable()
export class HubStrategy extends PassportStrategy(Strategy, 'hub') {
  private readonly logger = new Logger(HubStrategy.name);
  private jwks: JWTVerifyGetKey | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super();
  }

  private getJwks(): JWTVerifyGetKey {
    if (!this.jwks) {
      const jwksUri = this.configService.get<string>('auth.hub.jwksUri');
      if (!jwksUri) {
        throw new UnauthorizedException('Hub JWKS URI not configured');
      }
      this.jwks = createRemoteJWKSet(new URL(jwksUri));
    }
    return this.jwks;
  }

  private async validateLocalUser() {
    const existingUser = await this.userRepository.findLocalUser();
    if (existingUser) {
      return existingUser;
    }

    const user = await this.userRepository.create({
      id: crypto.randomUUID(),
      type: UserTypeEnum.Local,
      isActive: true,
      roles: [],
    });

    this.logger.log(`Local authentication successful for user ${user.id}`);

    return user;
  }

  private async validateCloudUser(req: Request) {
    const { idToken } = req.body as { idToken?: string };

    if (!idToken) {
      throw new UnauthorizedException('Missing ID token');
    }

    const issuer = this.configService.get<string>('auth.hub.issuer');
    const clientId = this.configService.get<string>('auth.clientId');

    const { payload } = await jwtVerify(idToken, this.getJwks(), {
      issuer,
      audience: clientId,
    });

    if (!payload.sub) {
      throw new UnauthorizedException('ID token missing sub claim');
    }

    const existingUser = await this.userRepository.findById(payload.sub);
    if (existingUser) {
      return existingUser;
    }

    const user = await this.userRepository.create({
      id: payload.sub,
      type: UserTypeEnum.Cloud,
      isActive: true,
      roles: [],
    });

    this.logger.log(`Hub ID token authentication successful for user ${user.id}`);

    return user;
  }

  async validate(req: Request): Promise<User> {
    try {
      const isLocalDevMode = this.configService.get<boolean>('app.isLocalMode');
      if (isLocalDevMode) {
        return this.validateLocalUser();
      }

      return await this.validateCloudUser(req);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('Authentication failed.');
    }
  }
}
