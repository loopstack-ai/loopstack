import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ConfigurableModuleClass,
  LoopCoreModuleOptions,
} from './loop-core.module-definition';
import { CommonModule } from './common';
import { PersistenceModule } from './persistence/persistence.module';
import { ProcessorModule } from './processor';
import { ExtensionsModule } from './extensions/extensions.module';
import { ConfigurationModule } from './configuration';

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
        ProcessorModule,
        ExtensionsModule,
      ],
      exports: [
        CommonModule,
        ConfigurationModule,
        PersistenceModule,
        ProcessorModule,
        ExtensionsModule,
      ],
    };
  }
}
