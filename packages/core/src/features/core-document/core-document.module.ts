import { Module } from '@nestjs/common';
import { CoreDocumentCapabilityFactory } from './core-document-capability.factory';
import { CommonModule } from '../../common';
import { CreateDocument } from './tools';
import { DocumentService } from './services';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '@loopstack/common';
import {
  AiMessageDocument,
  ErrorMessageDocument,
  MarkdownMessageDocument,
  MessageDocument,
  PlainMessageDocument,
} from './documents';
import { CreateChatMessage } from './tools';
import { WorkflowProcessorModule } from '../../workflow-processor';
import { CoreToolsModule } from '../core-tools';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    CommonModule,
    CoreToolsModule,
    WorkflowProcessorModule,
  ],
  providers: [
    CoreDocumentCapabilityFactory,
    DocumentService,

    // Tools
    CreateDocument,
    CreateChatMessage,

    // Documents
    ErrorMessageDocument,
    MarkdownMessageDocument,
    MessageDocument,
    PlainMessageDocument,
    AiMessageDocument,
  ],
  exports: [CoreDocumentCapabilityFactory, DocumentService],
})
export class CoreDocumentModule {}
