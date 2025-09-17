import { Injectable, UnauthorizedException, Logger, ConflictException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { HubService } from '../services';
import { Request } from 'express';
import { UserRepository } from '../repositories';
import { AUTH_CONFIG } from '../constants';
import { AuthConfig } from '../interfaces';

@Injectable()
export class HubStrategy extends PassportStrategy(Strategy, 'hub') {
  private readonly logger = new Logger(HubStrategy.name);

  constructor(
    @Inject(AUTH_CONFIG) private config: AuthConfig,
    private hubService: HubService,
    private userRepository: UserRepository,
  ) {
    super();
  }

  async validate(req: Request): Promise<any> {
    try {
      const { code, grantType } = req.body;

      this.logger.log('Validating SSO token exchange request');

      if (!code || grantType !== 'authorization_code') {
        throw new UnauthorizedException('Invalid grant type or missing code');
      }

      const hubUserInfo = await this.hubService.exchangeCodeForUserInfo(code);
      if (!hubUserInfo) {
        throw new UnauthorizedException('Code exchange failed');
      }

      const existingUser = await this.userRepository.findById(hubUserInfo.id);
      if (existingUser) {
        return existingUser;
      }

      const user = await this.userRepository.create({
        id: hubUserInfo.id,
        workerId: this.config.clientId,
        isActive: true,
        roles: [],
      });

      this.logger.log(`SSO validation successful for user ${user.id}`);

      return user;
    } catch (error) {
      this.logger.error('SSO validation failed:', error);
      throw new UnauthorizedException('SSO authentication failed');
    }
  }
}