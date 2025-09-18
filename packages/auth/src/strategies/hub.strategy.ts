import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { HubService } from '../services';
import { Request } from 'express';
import { UserRepository } from '../repositories';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HubStrategy extends PassportStrategy(Strategy, 'hub') {
  private readonly logger = new Logger(HubStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly hubService: HubService,
    private readonly userRepository: UserRepository,
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

      const validateCodeResponse = await this.hubService.exchangeCodeForUserInfo(code);
      if (!validateCodeResponse.data?.id) {
        throw new UnauthorizedException('Code exchange failed');
      }

      const existingUser = await this.userRepository.findById(validateCodeResponse.data?.id);
      if (existingUser) {
        return existingUser;
      }

      const workerId = this.configService.get<string>('clientId');

      const user = await this.userRepository.create({
        id: validateCodeResponse.data?.id,
        workerId: workerId,
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