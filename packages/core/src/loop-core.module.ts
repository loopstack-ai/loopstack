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
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
              installTemplates:
                undefined === options?.installTemplates
                  ? true
                  : options.installTemplates,
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
      providers: [MigrationsService, ConfigProviderService],
      exports: [
        ConfigurationModule,
        CommonModule,
        PersistenceModule,
        WorkflowProcessorModule,
      ],
    };
  }
}
