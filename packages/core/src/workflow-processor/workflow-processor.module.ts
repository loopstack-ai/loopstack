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
  ProcessorFactory,
  RootProcessorService,
  StateMachineProcessorService,
  StateMachineToolCallProcessorService,
  StateMachineValidatorRegistry,
  StateMachineValidatorService,
  ToolExecutionInterceptorService,
  WorkflowMemoryMonitorService,
  WorkflowProcessorService,
  WorkflowStateService,
} from './services';
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
    StateMachineProcessorService,
    StateMachineToolCallProcessorService,
    ToolExecutionInterceptorService,
    WorkflowMemoryMonitorService,
    CreateWorkflowService,
  ],
  exports: [
    PersistenceModule,
    RootProcessorService,
    CreateWorkflowService,
    BlockProcessor,
    WorkflowProcessorService,
    BlockDiscoveryService,
    StateMachineToolCallProcessorService,
    WorkflowMemoryMonitorService,
  ],
})
export class WorkflowProcessorModule {}
