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
  StateMachineConfigService,
  StateMachineProcessorService,
  StateMachineValidatorRegistry,
  ToolExecutionService,
  NamespaceProcessorService,
  PipelineProcessorService,
  WorkflowProcessorService,
  TemplateExpressionEvaluatorService,
  WorkflowStateService,
  RootProcessorService,
  WorkflowContextService,
} from './services';
import { CreatePipelineService } from './services';
import { MockHandler } from './handlers/mock.handler';
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
  SqlQuery,
  SwitchTarget,
  UpdateDocument,
  ValidateDocument,
  Validate,
} from './blocks';
import { CreateDocumentService } from './blocks/services/create-document.service';
import { CreateEntityService } from './blocks/services/create-entity.service';

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
    StateMachineConfigService,
    CreatePipelineService,
    CreateChatMessage,
    CreateEntity,
    CreateErrorMessage,
    CreateMarkdownMessage,
    CreatePlainMessage,
    CreateResponse,
    Debug,
    CreateDocumentService,
    CreateEntityService,
    LoadDocument,
    MockService,
    MockHandler,
    ResetError,
    SqlQuery,
    SwitchTarget,
    UpdateDocument,
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
  ],
})
export class WorkflowProcessorModule {}
