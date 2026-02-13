import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity, NamespaceEntity, PipelineEntity, WorkflowEntity, WorkspaceEntity } from '@loopstack/common';
import { CommonModule } from '../common';
import { PersistenceModule } from '../persistence';
import {
  BlockDiscoveryService,
  BlockProcessor,
  NamespaceProcessorService,
  ProcessorFactory,
  RootProcessorService,
  StateMachineProcessorService,
  StateMachineToolCallProcessorService,
  StateMachineValidatorRegistry,
  StateMachineValidatorService,
  WorkflowProcessorService,
  WorkflowStateService,
} from './services';
import { CreatePipelineService } from './services';
import { InitialRunValidator, WorkflowDependenciesValidator, WorkflowOptionValidator } from './validators';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineEntity, WorkflowEntity, DocumentEntity, WorkspaceEntity, NamespaceEntity]),
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
    NamespaceProcessorService,
    InitialRunValidator,
    WorkflowDependenciesValidator,
    WorkflowOptionValidator,
    StateMachineValidatorRegistry,
    StateMachineValidatorService,
    StateMachineProcessorService,
    StateMachineToolCallProcessorService,
    CreatePipelineService,
  ],
  exports: [
    PersistenceModule,
    RootProcessorService,
    CreatePipelineService,
    BlockProcessor,
    WorkflowProcessorService,
    BlockDiscoveryService,
  ],
})
export class WorkflowProcessorModule {}
