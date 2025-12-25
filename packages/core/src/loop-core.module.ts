import { Module } from '@nestjs/common';
import { SchedulerModule } from './scheduler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  DocumentEntity,
  NamespaceEntity,
  PipelineEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { CommonModule } from './common';
import { WorkflowProcessorModule } from './workflow-processor';
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
  ],
  exports: [CommonModule, WorkflowProcessorModule, SchedulerModule],
})
export class LoopCoreModule {}
