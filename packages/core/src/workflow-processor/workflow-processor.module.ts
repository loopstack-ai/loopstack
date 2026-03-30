import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DocumentEntity,
  PipelineEntity,
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
import { CreatePipelineService } from './services';
import { InitialRunValidator, WorkflowDependenciesValidator, WorkflowOptionValidator } from './validators';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineEntity,
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
    // {
    //   provide: DynamicRepositoryService,
    //   useFactory: (dataSource) => {
    //     return new DynamicRepositoryService(dataSource, {
    //       blacklist: [],
    //     });
    //   },
    //   inject: [DataSource],
    // },

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
    CreatePipelineService,
  ],
  exports: [
    PersistenceModule,
    RootProcessorService,
    CreatePipelineService,
    BlockProcessor,
    WorkflowProcessorService,
    BlockDiscoveryService,
    StateMachineToolCallProcessorService,
    WorkflowMemoryMonitorService,
  ],
})
export class WorkflowProcessorModule {}
