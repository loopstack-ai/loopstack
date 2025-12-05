import { Module } from '@nestjs/common';
import { MigrationsService } from './services/migrations.service';
import { SchedulerModule } from './scheduler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  DocumentEntity,
  MODULE_NAME_TOKEN,
  NamespaceEntity,
  PipelineEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { CommonModule } from './common';
import { WorkflowProcessorModule } from './workflow-processor';
import { CliModule } from './cli';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkspaceEntity,
      NamespaceEntity,
    ]),
    EventEmitterModule.forRoot({
      global: true,
    }),
    CommonModule,
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
  exports: [CommonModule, WorkflowProcessorModule, SchedulerModule],
})
export class LoopCoreModule {}
