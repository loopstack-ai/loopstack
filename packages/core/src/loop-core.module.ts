import { Module } from '@nestjs/common';
import { MigrationsService } from './services/migrations.service';
import { SchedulerModule } from './scheduler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MODULE_NAME_TOKEN } from '@loopstack/common';
import { CommonModule } from './common';
import { PersistenceModule } from './persistence';
import { WorkflowProcessorModule } from './workflow-processor';
import { CliModule } from './cli';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      global: true,
    }),
    CommonModule,
    PersistenceModule,
    WorkflowProcessorModule,
    SchedulerModule,
    CliModule,
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
    PersistenceModule,
    WorkflowProcessorModule,
    SchedulerModule,
  ],
})
export class LoopCoreModule {}
