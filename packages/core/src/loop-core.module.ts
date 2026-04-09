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
import { GetSecretKeysTool, RequestSecretsTask, RequestSecretsTool, SecretsRequestWorkflow } from './tools';
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

    GetSecretKeysTool,
    RequestSecretsTool,
    RequestSecretsTask,

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

    GetSecretKeysTool,
    RequestSecretsTool,
    RequestSecretsTask,

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
