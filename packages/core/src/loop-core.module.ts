import { Module } from '@nestjs/common';
import { LoopCoreService } from './loop-core.service';
import { ConfigurationModule } from './configuration/configuration.module';
import { ProcessorModule } from './processor/processor.module';
import { ConfigurableModuleClass } from './loop-core.module-definition';

@Module({
  imports: [ConfigurationModule, ProcessorModule],
  providers: [LoopCoreService],
  exports: [ConfigurationModule, ProcessorModule],
})
export class LoopCoreModule extends ConfigurableModuleClass {}
