import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { AUTH_CONFIG } from '../constants';
import { AuthConfig } from '../interfaces';
import axios, { AxiosError } from 'axios';

@Injectable()
export class HubService {
  private readonly logger = new Logger(HubService.name);

  constructor(
    @Inject(AUTH_CONFIG) private config: AuthConfig,
  ) {}

  async exchangeCodeForUserInfo(code: string): Promise<any> {
    if (!this.config.authCallback || !this.config.clientId || !this.config.clientSecret) {
      throw new BadGatewayException('Hub callback url, worker id or secret not defined.')
    }

    try {
      const response = await axios.post(
        this.config.authCallback,
        {
          clientId: this.config.clientId,
          code
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.clientSecret}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      this.logger.log('Code exchange successful');
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`Code exchange failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);

        if (error.response?.status === 400) {
          throw new BadRequestException('Invalid or expired authorization code');
        } else if (error.response?.status === 401) {
          throw new BadRequestException('Invalid service token or user ID');
        }
      } else {
        this.logger.error('Code exchange failed with unknown error:', error);
      }

      throw new BadRequestException('Failed to validate authorization code');
    }
  }
}