import { Module } from '@nestjs/common';
import { ConfigurationModule } from './configuration/configuration.module';
import { ProcessorModule } from './processor/processor.module';
import { ConfigurableModuleClass } from './loop-core.module-definition';
import { PersistenceModule } from './persistence/persistence.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ExtensionsModule } from './extensions/extensions.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigurationModule,
    PersistenceModule,
    ProcessorModule,
    ExtensionsModule,
  ],
  providers: [],
  exports: [ConfigurationModule, PersistenceModule, ProcessorModule],
})
export class LoopCoreModule extends ConfigurableModuleClass {}
