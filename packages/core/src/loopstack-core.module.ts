import { DynamicModule, Module } from '@nestjs/common';
import { LoopstackCoreService } from './loopstack-core.service';
import { LoopstackCoreModuleOptionsInterface } from './configuration/interfaces/loopstack-core-module-options.interface';
import { ConfigurationModule } from './configuration/configuration.module';
import {ProcessorModule} from "./processor/processor.module";

@Module({
  imports: [
    ConfigurationModule,
    ProcessorModule,
  ],
  providers: [LoopstackCoreService],
  exports: [ConfigurationModule, ProcessorModule],
})
export class LoopstackCoreModule {
  static forRoot(config: LoopstackCoreModuleOptionsInterface): DynamicModule {
    return {
      module: LoopstackCoreModule,
      imports: [],
    };
  }
}
