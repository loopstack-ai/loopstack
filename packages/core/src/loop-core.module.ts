import { Module } from '@nestjs/common';
import {
  CommonModule,
  WorkflowProcessorModule,
  PersistenceModule,
  ConfigurationModule,
} from './modules';
import { MigrationsService } from './services/migrations.service';
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
  ],
  exports: [
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
    WorkflowProcessorModule,
    SchedulerModule,
  ],
})
export class LoopCoreModule {}