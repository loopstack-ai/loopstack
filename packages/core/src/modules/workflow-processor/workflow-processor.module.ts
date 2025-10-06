import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration';
import { PersistenceModule } from '../persistence';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../common';
import {
  InitialRunValidator,
  WorkflowDependenciesValidator,
  WorkflowOptionValidator,
} from './validators';
import {
  StateMachineProcessorService,
  StateMachineValidatorRegistry,
  ToolExecutionService,
  NamespaceProcessorService,
  PipelineProcessorService,
  WorkflowProcessorService,
  TemplateExpressionEvaluatorService,
  WorkflowStateService,
  RootProcessorService,
  WorkflowContextService, BlockHelperService,
} from './services';
import { CreatePipelineService } from './services';
import { MockService } from './blocks/services/mock.service';
import {
  CreateChatMessage,
  CreateDocument,
  CreateEntity,
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
  SetContext,
  ResetError,
  SwitchTarget,
  ValidateDocument,
  Validate,
  BatchCreateMessages,
} from './blocks';
import { SqlQuery, BatchCreateEntity } from '../persistence/blocks/tools';
import { CreateDocumentService } from './blocks/services/create-document.service';
import { CreateEntityService } from './blocks/services/create-entity.service';
import { ServiceStateFactory } from './services/service-state-factory.service';

@Module({
  imports: [
    DiscoveryModule,
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
  ],
  providers: [
    RootProcessorService,
    WorkflowStateService,
    WorkflowProcessorService,
    ToolExecutionService,
    NamespaceProcessorService,
    PipelineProcessorService,
    TemplateExpressionEvaluatorService,
    WorkflowContextService,
    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,
    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    ServiceStateFactory,
    BlockHelperService,
    CreatePipelineService,
    CreateChatMessage,
    CreateEntity,
    CreateErrorMessage,
    CreateMarkdownMessage,
    CreatePlainMessage,
    CreateResponse,
    Debug,
    BatchCreateMessages,
    BatchCreateEntity,
    CreateDocumentService,
    CreateEntityService,
    BatchCreateDocumentsService,
    LoadDocument,
    MockService,
    ResetError,
    SqlQuery,
    SwitchTarget,
    ValidateDocument,
    Validate,
    CreateMock,
    CreateDocument,
    MessageDocument,
    ErrorMessageDocument,
    MarkdownMessageDocument,
    PlainMessageDocument,
    SetContext,
  ],
  exports: [
    RootProcessorService,
    ToolExecutionService,
    TemplateExpressionEvaluatorService,
    CreatePipelineService,
    SqlQuery,
    BatchCreateEntity,
  ],
})
export class WorkflowProcessorModule {}
