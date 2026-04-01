import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkspaceEntity,
  WorkspaceEnvironmentEntity,
} from '@loopstack/common';
import { CommonModule } from '../common';
import { PersistenceModule } from '../persistence';
import {
  BlockDiscoveryService,
  BlockProcessor,
  CreateWorkflowService,
  DocumentPersistenceService,
  ProcessorFactory,
  RootProcessorService,
  StateMachineValidatorRegistry,
  StateMachineValidatorService,
  ToolExecutionInterceptorService,
  ToolExecutionService,
  TransitionResolverService,
  WorkflowMemoryMonitorService,
  WorkflowOrchestrationService,
  WorkflowProcessorService,
  WorkflowStateService,
} from './services';
import { ExecutionScope } from './utils';
import { InitialRunValidator, WorkflowDependenciesValidator, WorkflowOptionValidator } from './validators';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowEntity,
      DocumentEntity,
      WorkspaceEntity,
      WorkspaceEnvironmentEntity,
      WorkflowCheckpointEntity,
    ]),
    PersistenceModule,
    DiscoveryModule,
    CommonModule,
  ],
  providers: [
    RootProcessorService,
    BlockProcessor,
    ProcessorFactory,
    WorkflowProcessorService,
    BlockDiscoveryService,

    WorkflowStateService,
    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,
    StateMachineValidatorRegistry,
    StateMachineValidatorService,
    ToolExecutionInterceptorService,
    WorkflowMemoryMonitorService,
    CreateWorkflowService,
    ExecutionScope,
    ToolExecutionService,
    DocumentPersistenceService,
    WorkflowOrchestrationService,
    TransitionResolverService,
  ],
  exports: [
    PersistenceModule,
    RootProcessorService,
    CreateWorkflowService,
    BlockProcessor,
    WorkflowProcessorService,
    BlockDiscoveryService,
    WorkflowMemoryMonitorService,
    ExecutionScope,
    ToolExecutionService,
    DocumentPersistenceService,
    WorkflowOrchestrationService,
    TransitionResolverService,
  ],
})
export class WorkflowProcessorModule {}
