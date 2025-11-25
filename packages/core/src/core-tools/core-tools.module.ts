import { Module } from '@nestjs/common';
import { ModuleFactory } from '@loopstack/common';
import { CoreToolsFactoryService } from './core-tools-factory.service';
import {
  BatchCreateMessages,
  CreateChatMessage,
  CreateDocument,
  CreateErrorMessage,
  CreateMarkdownMessage,
  CreateMock,
  CreatePlainMessage,
  CreateResponse,
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
import { PersistenceModule } from '../persistence';
import { AiMessageDocument } from './documents/ai-message-document';

@Module({
  imports: [CommonModule, PersistenceModule, WorkflowProcessorModule],
  providers: [
    CoreToolsFactoryService,

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

    AiMessageDocument,
  ],
  exports: [CoreToolsFactoryService, CreateDocumentService],
})
@ModuleFactory(CoreToolsFactoryService)
export class CoreToolsModule {}
