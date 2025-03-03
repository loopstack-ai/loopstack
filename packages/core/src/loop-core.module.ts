import { Module } from '@nestjs/common';
import { ConfigurationModule } from './configuration/configuration.module';
import { ProcessorModule } from './processor/processor.module';
import { ConfigurableModuleClass } from './loop-core.module-definition';
import { PersistenceModule } from './persistence/persistence.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigurationModule,
    PersistenceModule,
    ProcessorModule,
  ],
  providers: [],
  exports: [ConfigurationModule, PersistenceModule, ProcessorModule],
})
export class LoopCoreModule extends ConfigurableModuleClass {}
