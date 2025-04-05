import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ConfigurableModuleClass,
  LoopCoreModuleOptions,
} from './loop-core.module-definition';
import {
  CommonModule,
  CoreExtensionModule,
  WorkflowProcessorModule,
  PersistenceModule,
  ConfigurationModule,
  ProjectProcessorModule,
} from './modules';
import { MigrationsService } from './services/migrations.service';

@Module({})
export class LoopCoreModule extends ConfigurableModuleClass {
  static forRoot(options?: LoopCoreModuleOptions): DynamicModule {
    return {
      ...super.register(options ?? {}),
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => options ?? {}],
        }),
        CommonModule,
        ConfigurationModule,
        PersistenceModule,
        WorkflowProcessorModule,
        ProjectProcessorModule,
        CoreExtensionModule,
      ],
      providers: [MigrationsService],
      exports: [
        CommonModule,
        ConfigurationModule,
        PersistenceModule,
        WorkflowProcessorModule,
        ProjectProcessorModule,
        CoreExtensionModule,
      ],
    };
  }
}
