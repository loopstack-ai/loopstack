import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity, WorkflowEntity, WorkspaceEntity, WorkspaceEnvironmentEntity } from '@loopstack/common';
import { CommonModule } from './common';
import { ErrorDocument, LinkDocument, MarkdownDocument, MessageDocument, PlainDocument } from './documents';
import { SchedulerModule } from './scheduler';
import { WorkflowProcessorModule } from './workflow-processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowEntity, DocumentEntity, WorkspaceEntity, WorkspaceEnvironmentEntity]),
    EventEmitterModule.forRoot({
      global: true,
    }),
    CommonModule,
    WorkflowProcessorModule,
    SchedulerModule,
  ],
  providers: [
    // Documents
    ErrorDocument,
    LinkDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,
  ],
  exports: [
    CommonModule,
    WorkflowProcessorModule,
    SchedulerModule,

    ErrorDocument,
    LinkDocument,
    MarkdownDocument,
    MessageDocument,
    PlainDocument,
  ],
})
export class LoopCoreModule {}
