import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
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
import {
  CreateDocument,
  GetSecretKeysTool,
  RequestSecretsTask,
  RequestSecretsTool,
  SecretsRequestWorkflow,
  Task,
} from './tools';
import { WorkflowProcessorModule } from './workflow-processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowEntity,
      DocumentEntity,
      WorkspaceEntity,
      WorkspaceEnvironmentEntity,
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
    GetSecretKeysTool,
    RequestSecretsTool,
    RequestSecretsTask,
    Task,
    SecretsRequestWorkflow,

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
    GetSecretKeysTool,
    RequestSecretsTool,
    RequestSecretsTask,
    Task,
    SecretsRequestWorkflow,
    ErrorDocument,
    LinkDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,
    SecretRequestDocument,
  ],
})
export class LoopCoreModule {}
