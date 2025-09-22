import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigValidationService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.validateAuthConfig();
  }

  private validateAuthConfig(): void {
    const requiredConfigs = [
      { key: 'auth.clientId', name: 'CLIENT_ID' },
    ];

    const missingConfigs: string[] = [];

    requiredConfigs.forEach(({ key, name }) => {
      const value = this.configService.get<string>(key);
      if (!value) {
        missingConfigs.push(name);
      }
    });

    if (missingConfigs.length > 0) {
      throw new Error(
        `Missing required configuration values: ${missingConfigs.join(', ')}`
      );
    }
  }
}