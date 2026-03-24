import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  NamespaceEntity,
  PipelineEntity,
  SecretEntity,
  WorkflowEntity,
  WorkspaceEntity,
  WorkspaceEnvironmentEntity,
} from '@loopstack/common';
import { CommonModule } from './common';
import {
  ErrorDocument,
  LinkDocument,
  MarkdownDocument,
  MessageDocument,
  PlainDocument,
  SecretRequestDocument,
} from './documents';
import { SchedulerModule } from './scheduler';
import { CreateDocument, ExecuteWorkflowAsync, GetSecretKeysTool, RequestSecretsTool } from './tools';
import { WorkflowProcessorModule } from './workflow-processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineEntity,
      WorkflowEntity,
      DocumentEntity,
      WorkspaceEntity,
      WorkspaceEnvironmentEntity,
      NamespaceEntity,
      SecretEntity,
    ]),
    EventEmitterModule.forRoot({
      global: true,
    }),
    CommonModule,
    WorkflowProcessorModule,
    SchedulerModule,
  ],
  providers: [
    // Tools
    CreateDocument,
    ExecuteWorkflowAsync,
    GetSecretKeysTool,
    RequestSecretsTool,

    // Documents
    ErrorDocument,
    LinkDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,
    SecretRequestDocument,
  ],
  exports: [
    CommonModule,
    WorkflowProcessorModule,
    SchedulerModule,
    CreateDocument,
    ExecuteWorkflowAsync,
    GetSecretKeysTool,
    RequestSecretsTool,
    ErrorDocument,
    LinkDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,
    SecretRequestDocument,
  ],
})
export class LoopCoreModule {}
