import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../configuration';
import { PersistenceModule } from '../persistence';
import { DiscoveryModule } from '@nestjs/core';
import { CommonModule } from '../common';
import { NamespaceProcessorService, ProjectProcessorService } from './services';

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
  WorkflowProcessorService,
} from './services';
import {
  AddNamespaceService,
  CreateDocumentService,
  DebugImportsService, DebugService,
  LoadDocumentService,
  SetContextService,
  ToolCallService,
  TransitionSelectorService,
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
    ToolCallService,
    CreateDocumentService,
    DebugImportsService,
    DebugService,
    SetContextService,
    AddNamespaceService,
    LoadDocumentService,
    TransitionSelectorService,
    NamespaceProcessorService,
    ProjectProcessorService,

    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,

    StateMachineValidatorRegistry,
    StateMachineProcessorService,
    StateMachineConfigService,
  ],
  exports: [
    ProjectProcessorService,
    WorkflowProcessorService,
  ],
})
export class WorkflowProcessorModule {}
