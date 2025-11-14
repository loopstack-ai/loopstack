import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { HubService } from '../services';
import { Request } from 'express';
import { UserRepository } from '../repositories';
import { ConfigService } from '@nestjs/config';
import { UserTypeEnum } from '@loopstack/shared/dist/enums/user-type.enum';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@loopstack/shared';

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

  private async validateLocalUser() {
    const existingUser = await this.userRepository.findLocalUser();
    if (existingUser) {
      return existingUser;
    }

    const user = await this.userRepository.create({
      id: uuidv4(),
      type: UserTypeEnum.Local,
      isActive: true,
      roles: [],
    });

    this.logger.log(`Local authentication successful for user ${user.id}`);

    return user;
  }

  private async validateCloudUser(req: Request) {
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

    const user = await this.userRepository.create({
      id: validateCodeResponse.data?.id,
      isActive: true,
      roles: [],
    });

    this.logger.log(`SSO authentication successful for user ${user.id}`);

    return user;
  }

  async validate(req: Request): Promise<User> {
    try {
      const isLocalDevMode = this.configService.get<boolean>('app.isLocalMode');
      if (isLocalDevMode) {
        return this.validateLocalUser();
      }

      return this.validateCloudUser(req);
    } catch (error) {
      throw new UnauthorizedException('Authentication failed.');
    }
  }
}