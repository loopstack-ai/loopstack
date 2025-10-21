import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../common';
import {
  InitialRunValidator,
  WorkflowDependenciesValidator,
  WorkflowOptionValidator,
} from './validators';
import {
  StateMachineValidatorRegistry,
  NamespaceProcessorService,
  TemplateExpressionEvaluatorService,
  WorkflowStateService,
  RootProcessorService,
  BlockHelperService,
  CapabilityBuilder,
  BlockRegistryService,
  ConfigLoaderService,
  BlockFactory,
  ProcessorFactory,
  FactoryProcessorService,
  SequenceProcessorService,
  BlockProcessor,
  WorkflowProcessorService,
  WorkspaceProcessorService,
  ToolProcessorService,
} from './services';
import { CreatePipelineService } from './services';
import { MockService } from './blocks/services/mock.service';
import {
  CreateChatMessage,
  CreateDocument,
  CreateErrorMessage,
  CreateMarkdownMessage,
  CreatePlainMessage,
  CreateResponse,
  Debug,
  CreateMock,
  ErrorMessageDocument,
  LoadDocument,
  MarkdownMessageDocument,
  MessageDocument,
  PlainMessageDocument,
  ResetError,
  SwitchTarget,
  ValidateDocument,
  Validate,
  BatchCreateMessages,
} from './blocks';
import { CreateDocumentService } from './blocks/services/create-document.service';
import { BatchCreateDocumentsService } from './blocks/services/batch-create-documents.service';
import { CoreFactoryService } from './blocks/core-factory.service';
import { ModuleFactory } from '@loopstack/shared';

@Module({
  imports: [DiscoveryModule, CommonModule, PersistenceModule],
  providers: [
    RootProcessorService,
    BlockFactory,
    BlockProcessor,
    ProcessorFactory,
    FactoryProcessorService,
    SequenceProcessorService,
    WorkflowProcessorService,
    WorkspaceProcessorService,
    ToolProcessorService,

    WorkflowStateService,
    NamespaceProcessorService,
    TemplateExpressionEvaluatorService,
    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,
    StateMachineValidatorRegistry,
    BlockHelperService,
    CreatePipelineService,
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

    ConfigLoaderService,
    BlockRegistryService,
    CapabilityBuilder,

    CoreFactoryService,
  ],
  exports: [
    RootProcessorService,
    TemplateExpressionEvaluatorService,
    CreatePipelineService,
    CreateChatMessage,
    BlockRegistryService,
    CoreFactoryService,
  ],
})
@ModuleFactory(CoreFactoryService)
export class WorkflowProcessorModule {}
