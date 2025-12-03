import { Module } from '@nestjs/common';
import { CoreToolsModuleCapabilityFactory } from './core-tools-module-capability.factory';
import {
  BatchCreateMessages,
  CreateChatMessage,
  CreateDocument,
  CreateErrorMessage,
  CreateMarkdownMessage,
  CreateMock,
  CreatePlainMessage,
  CreateResponse, CreateValue,
  Debug,
  ErrorMessageDocument,
  LoadDocument,
  MarkdownMessageDocument,
  MessageDocument,
  PlainMessageDocument,
  ResetError,
  SwitchTarget,
  Validate,
  ValidateDocument,
} from './index';
import { CreateDocumentService } from './services';
import { BatchCreateDocumentsService } from './services/batch-create-documents.service';
import { MockService } from './services/mock.service';
import { CommonModule } from '../common';
import { WorkflowProcessorModule } from '../workflow-processor';
import { AiMessageDocument } from './documents/ai-message-document';

@Module({
  imports: [CommonModule, WorkflowProcessorModule],
  providers: [
    CoreToolsModuleCapabilityFactory,

    CreateChatMessage,
    CreateErrorMessage,
    CreateMarkdownMessage,
    CreatePlainMessage,
    CreateResponse,
    Debug,
    BatchCreateMessages,
    CreateDocumentService,
    BatchCreateDocumentsService,
    LoadDocument,
    MockService,
    ResetError,
    SwitchTarget,
    ValidateDocument,
    Validate,
    CreateMock,
    CreateDocument,
    MessageDocument,
    ErrorMessageDocument,
    MarkdownMessageDocument,
    PlainMessageDocument,
    CreateValue,

    AiMessageDocument,
  ],
  exports: [CoreToolsModuleCapabilityFactory, CreateDocumentService],
})
export class CoreToolsModule {}
