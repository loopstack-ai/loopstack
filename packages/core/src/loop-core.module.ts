import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ConfigurableModuleClass,
  LoopCoreModuleOptions,
} from './loop-core.module-definition';
import {
  CommonModule,
  WorkflowProcessorModule,
  PersistenceModule,
  ConfigurationModule,
} from './modules';
import { MigrationsService } from './services/migrations.service';
import { ConfigProviderService } from './config-provider.service';
import { SchedulerModule } from './modules/scheduler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MODULE_NAME_TOKEN } from '@loopstack/shared';

@Module({})
export class LoopCoreModule extends ConfigurableModuleClass {
  static forRoot(options?: LoopCoreModuleOptions): DynamicModule {
    return {
      ...super.register(options ?? {}),
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              runStartupTasks:
                undefined === options?.runStartupTasks
                  ? true
                  : options.runStartupTasks,
              configs: options?.configs ?? [],
            }),
          ],
        }),
        EventEmitterModule.forRoot({
          global: true,
        }),
        CommonModule,
        ConfigurationModule,
        PersistenceModule,
        WorkflowProcessorModule,
        SchedulerModule,
      ],
      providers: [
        {
          provide: MODULE_NAME_TOKEN,
          useValue: 'core',
        },
        MigrationsService,
        ConfigProviderService,
      ],
      exports: [
        ConfigurationModule,
        CommonModule,
        PersistenceModule,
        WorkflowProcessorModule,
        SchedulerModule,
      ],
    };
  }
}
