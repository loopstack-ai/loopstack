import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity, NamespaceEntity, PipelineEntity, WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import { CommonModule } from './common';
import { SchedulerModule } from './scheduler';
import { ExecuteWorkflowAsync } from './tools';
import { WorkflowProcessorModule } from './workflow-processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineEntity, WorkflowEntity, DocumentEntity, WorkspaceEntity, NamespaceEntity]),
    EventEmitterModule.forRoot({
      global: true,
    }),
    CommonModule,
    WorkflowProcessorModule,
    SchedulerModule,
  ],
  providers: [ExecuteWorkflowAsync],
  exports: [CommonModule, WorkflowProcessorModule, SchedulerModule, ExecuteWorkflowAsync],
})
export class LoopCoreModule {}
