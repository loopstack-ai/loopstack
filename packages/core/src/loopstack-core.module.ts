import { Module } from '@nestjs/common';
import { LoopstackCoreService } from './loopstack-core.service';
import { ConfigurationModule } from './configuration/configuration.module';
import { ProcessorModule } from "./processor/processor.module";
import {ConfigurableModuleClass} from "./loopstack-core.module-definition";

@Module({
  imports: [
    ConfigurationModule,
    ProcessorModule,
  ],
  providers: [LoopstackCoreService],
  exports: [ConfigurationModule, ProcessorModule],
})
export class LoopstackCoreModule extends ConfigurableModuleClass {}
