import { Module } from '@nestjs/common';
import {
  CommonModule,
  WorkflowProcessorModule,
  PersistenceModule,
  ConfigurationModule,
} from './modules';
import { MigrationsService } from './services/migrations.service';
import { ConfigProviderService } from './config-provider.service';
import { SchedulerModule } from './modules/scheduler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MODULE_NAME_TOKEN } from '@loopstack/shared';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      global: true,
    }),
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
    WorkflowProcessorModule,
    SchedulerModule,
  ],
  providers: [
    {
      provide: MODULE_NAME_TOKEN,
      useValue: 'core',
    },
    MigrationsService,
    ConfigProviderService,
  ],
  exports: [
    ConfigurationModule,
    CommonModule,
    PersistenceModule,
    WorkflowProcessorModule,
    SchedulerModule,
  ],
})
export class LoopCoreModule {}