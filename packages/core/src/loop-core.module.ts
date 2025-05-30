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
        CommonModule,
        ConfigurationModule,
        PersistenceModule,
        WorkflowProcessorModule,
      ],
      providers: [MigrationsService, ConfigProviderService],
      exports: [
        CommonModule,
        ConfigurationModule,
        PersistenceModule,
        WorkflowProcessorModule,
      ],
    };
  }
}
