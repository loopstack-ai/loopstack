import { Module } from '@nestjs/common';
import { CommonModule } from '../../common';
import { CreateDocument } from './tools';
import { DocumentService } from './services';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '@loopstack/common';
import {
  ErrorMessageDocument,
  MarkdownMessageDocument,
  MessageDocument,
  PlainMessageDocument,
} from './documents';
import { CreateChatMessage } from './tools';
import { WorkflowProcessorModule } from '../../workflow-processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    CommonModule,
    WorkflowProcessorModule,
  ],
  providers: [
    DocumentService,

    // Tools
    CreateDocument,
    CreateChatMessage,

    // Documents
    ErrorMessageDocument,
    MarkdownMessageDocument,
    MessageDocument,
    PlainMessageDocument,
  ],
  exports: [
    DocumentService,
    CreateChatMessage,
    CreateDocument,
  ],
})
export class CoreDocumentModule {}
