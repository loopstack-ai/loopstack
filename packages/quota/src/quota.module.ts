import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { TOOL_EXECUTION_INTERCEPTORS } from '@loopstack/common';
import { AiGenerateTextQuotaCalculator } from './calculators';
import { QUOTA_CLIENT_SERVICE } from './interfaces';
import { QUOTA_REDIS, QuotaCalculatorRegistry, QuotaClientService, QuotaInterceptor } from './services';

export interface QuotaModuleOptions {
  enabled: boolean;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
}

@Module({})
export class QuotaModule implements OnModuleInit {
  constructor(private readonly calculatorRegistry: QuotaCalculatorRegistry) {}

  onModuleInit() {
    const aiTokenCalculator = new AiGenerateTextQuotaCalculator();
    this.calculatorRegistry.register('AiGenerateText', aiTokenCalculator);
    this.calculatorRegistry.register('AiGenerateObject', aiTokenCalculator);
    this.calculatorRegistry.register('AiGenerateDocument', aiTokenCalculator);
  }

  static forRoot(options?: QuotaModuleOptions): DynamicModule {
    const enabled = options?.enabled ?? false;

    const redisProvider = {
      provide: QUOTA_REDIS,
      useFactory: (): Redis | null => {
        if (!enabled) {
          return null;
        }
        return new Redis({
          host: options?.redisHost ?? 'localhost',
          port: options?.redisPort ?? 6379,
          password: options?.redisPassword,
          family: 0,
          maxRetriesPerRequest: 3,
          retryStrategy(times: number) {
            return Math.min(times * 200, 2000);
          },
        });
      },
    };

    return {
      module: QuotaModule,
      global: true,
      providers: [
        redisProvider,
        QuotaClientService,
        {
          provide: QUOTA_CLIENT_SERVICE,
          useExisting: QuotaClientService,
        },
        QuotaCalculatorRegistry,
        QuotaInterceptor,
        {
          provide: TOOL_EXECUTION_INTERCEPTORS,
          useExisting: QuotaInterceptor,
        },
      ],
      exports: [QUOTA_CLIENT_SERVICE, QuotaClientService, QuotaCalculatorRegistry, TOOL_EXECUTION_INTERCEPTORS],
    };
  }

  static forRootAsync(): DynamicModule {
    return QuotaModule.forRoot({
      enabled: process.env.QUOTA_ENABLED === 'true',
      redisHost: process.env.QUOTA_REDIS_HOST ?? process.env.REDIS_HOST,
      redisPort: parseInt(process.env.QUOTA_REDIS_PORT ?? process.env.REDIS_PORT ?? '6379', 10),
      redisPassword: process.env.QUOTA_REDIS_PASSWORD ?? process.env.REDIS_PASSWORD,
    });
  }
}
