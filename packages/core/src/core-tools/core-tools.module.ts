import { Module } from '@nestjs/common';
import { CoreToolsModuleCapabilityFactory } from './core-tools-module-capability.factory';
import {
  CreateChatMessage,
  CreateDocument,
  CreateValue, DelegateService,
  ErrorMessageDocument,
  MarkdownMessageDocument,
  MessageDocument,
  PlainMessageDocument,
  SwitchTarget,
} from './index';
import { CreateDocumentService } from './services';
import { BatchCreateDocumentsService } from './services/batch-create-documents.service';
import { MockService } from './services/mock.service';
import { CommonModule } from '../common';
import { WorkflowProcessorModule } from '../workflow-processor';
import { AiMessageDocument } from './documents/ai-message-document';
import { DelegateTool } from './tools/delegate.tool';

@Module({
  imports: [CommonModule, WorkflowProcessorModule],
  providers: [
    CoreToolsModuleCapabilityFactory,

    DelegateTool,
    DelegateService,

    CreateChatMessage,
    CreateDocumentService,
    BatchCreateDocumentsService,
    MockService,
    SwitchTarget,
    CreateDocument,
    MessageDocument,
    ErrorMessageDocument,
    MarkdownMessageDocument,
    PlainMessageDocument,
    CreateValue,

    AiMessageDocument,
  ],
  exports: [CoreToolsModuleCapabilityFactory, CreateDocumentService, DelegateService],
})
export class CoreToolsModule {}
