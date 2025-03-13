import { Module } from '@nestjs/common';
import { ProcessorModule } from './processor';
import { ConfigurableModuleClass } from './loop-core.module-definition';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ExtensionsModule } from './extensions/extensions.module';
import { ConfigurationModule } from './configuration';
import { PersistenceModule } from './persistence/persistence.module';
import { CommonModule } from './common';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
    ProcessorModule,
    ExtensionsModule,
  ],
  providers: [],
  exports: [
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
    ProcessorModule,
    ExtensionsModule,
  ],
})
export class LoopCoreModule extends ConfigurableModuleClass {}
