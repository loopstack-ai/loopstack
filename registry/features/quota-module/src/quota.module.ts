import { DynamicModule, Module, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AiGenerateTextQuotaCalculator } from './calculators/index.js';
import { QUOTA_CLIENT_SERVICE } from './interfaces/index.js';
import { QUOTA_REDIS, QuotaCalculatorRegistry, QuotaClientService, QuotaInterceptor } from './services/index.js';

/**
 * Options for `QuotaModule.forRoot()` — toggles quota tracking and configures the Redis connection.
 *
 * @public
 */
export interface QuotaModuleOptions {
  enabled: boolean;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
}

/**
 * NestJS module that provides opt-in quota tracking and enforcement for tool calls — the
 * `QuotaInterceptor`, `QuotaClientService`, `QuotaCalculatorRegistry`, and built-in
 * AI-cost and processing-time calculators.
 *
 * Registration:
 * - `QuotaModule.forRoot(QuotaModuleOptions)` — use when you configure the module in code; sets the
 *   `enabled` flag and the Redis connection (`redisHost`/`redisPort`/`redisPassword`) explicitly and
 *   registers the module globally.
 * - `QuotaModule.forRootAsync()` — use when configuration comes from the environment at runtime; reads
 *   `QUOTA_ENABLED`, `QUOTA_REDIS_HOST` (fallback `REDIS_HOST`), `QUOTA_REDIS_PORT` (fallback
 *   `REDIS_PORT`), and `QUOTA_REDIS_PASSWORD` (fallback `REDIS_PASSWORD`), then delegates to `forRoot`.
 *
 * Requires: a reachable Redis instance when `enabled: true` (usage counters are Redis-backed). When
 * `enabled` is `false` (the default), the Redis connection is skipped and the interceptor is a no-op.
 *
 * @public
 */
@Module({
  providers: [
    { provide: QUOTA_REDIS, useValue: null },
    QuotaClientService,
    { provide: QUOTA_CLIENT_SERVICE, useExisting: QuotaClientService },
    QuotaCalculatorRegistry,
    QuotaInterceptor,
  ],
  exports: [QUOTA_CLIENT_SERVICE, QuotaClientService, QuotaCalculatorRegistry],
})
export class QuotaModule implements OnModuleInit {
  constructor(private readonly calculatorRegistry: QuotaCalculatorRegistry) {}

  onModuleInit() {
    const aiTokenCalculator = new AiGenerateTextQuotaCalculator();
    this.calculatorRegistry.register('LlmGenerateTextTool', aiTokenCalculator);
    this.calculatorRegistry.register('LlmGenerateObjectTool', aiTokenCalculator);
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
        QuotaInterceptor, // Discovered automatically via @UseToolInterceptor()
      ],
      exports: [QUOTA_CLIENT_SERVICE, QuotaClientService, QuotaCalculatorRegistry],
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
