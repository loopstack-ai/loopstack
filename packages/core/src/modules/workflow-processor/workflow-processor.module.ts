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
  ProjectProcessorService,
  WorkflowProcessorService,
  ToolSchemaValidatorService,
} from './services';
import {
  AddNamespaceService,
  BatchCreateDocumentsService,
  CreateDocumentService,
  DebugImportsService,
  DebugService,
  LoadDocumentService,
  SetContextService,
  ToolCallService,
  TransitionSelectorService,
  UpdateDocumentService,
} from './tools';

@Module({
  imports: [
    DiscoveryModule,
    CommonModule,
    ConfigurationModule,
    PersistenceModule,
  ],
  providers: [
    WorkflowProcessorService,
    ToolExecutionService,
    ToolSchemaValidatorService,
    ToolCallService,
    CreateDocumentService,
    BatchCreateDocumentsService,
    DebugImportsService,
    DebugService,
    SetContextService,
    AddNamespaceService,
    LoadDocumentService,
    TransitionSelectorService,
    NamespaceProcessorService,
    ProjectProcessorService,
    UpdateDocumentService,

    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,

    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
  ],
  exports: [ProjectProcessorService, WorkflowProcessorService],
})
export class WorkflowProcessorModule {}
