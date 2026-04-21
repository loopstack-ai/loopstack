import { Global, Module, forwardRef } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DOCUMENT_REPOSITORY,
  DocumentEntity,
  FRAMEWORK_CONTEXT,
  TEMPLATE_RENDERER,
  WORKFLOW_ORCHESTRATOR,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkspaceEntity,
  WorkspaceEnvironmentEntity,
} from '@loopstack/common';
import { CommonModule } from '../common';
import { PersistenceModule } from '../persistence';
import { SchedulerModule } from '../scheduler';
import {
  BlockConfigCacheService,
  BlockDiscoveryService,
  BlockProcessor,
  CreateWorkflowService,
  DocumentPersistenceService,
  DocumentRepositoryService,
  ProcessorFactory,
  RootProcessorService,
  ToolExecutionService,
  ToolLoggingInterceptor,
  TransitionResolverService,
  WorkflowMemoryMonitorService,
  WorkflowOrchestrationService,
  WorkflowProcessorService,
  WorkflowStateService,
} from './services';
import { ExecutionScope, TemplateRenderer } from './utils';

@Global()
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
    forwardRef(() => SchedulerModule),
    DiscoveryModule,
    CommonModule,
  ],
  providers: [
    RootProcessorService,
    BlockProcessor,
    ProcessorFactory,
    WorkflowProcessorService,
    BlockDiscoveryService,
    BlockConfigCacheService,

    WorkflowStateService,
    WorkflowMemoryMonitorService,
    CreateWorkflowService,
    ExecutionScope,
    ToolExecutionService,
    DocumentPersistenceService,
    DocumentRepositoryService,
    WorkflowOrchestrationService,
    TransitionResolverService,

    // Built-in tool interceptor — discovered via @UseToolInterceptor()
    ToolLoggingInterceptor,

    // Framework injection tokens (consumed by BaseTool / BaseWorkflow via @Inject)
    {
      provide: DOCUMENT_REPOSITORY,
      useExisting: DocumentRepositoryService,
    },
    {
      provide: WORKFLOW_ORCHESTRATOR,
      useExisting: WorkflowOrchestrationService,
    },
    {
      provide: TEMPLATE_RENDERER,
      useFactory: () => new TemplateRenderer().render,
    },
    {
      provide: FRAMEWORK_CONTEXT,
      useFactory: (scope: ExecutionScope) => ({
        get context() {
          return scope.get().getContext();
        },
        get runtime() {
          return scope.get().getData();
        },
        get args() {
          return scope.get().getArgs();
        },
        get parent() {
          return scope.get().getInstance();
        },
        get workspace() {
          return scope.get().getContext().workspaceInstance;
        },
      }),
      inject: [ExecutionScope],
    },
  ],
  exports: [
    PersistenceModule,
    RootProcessorService,
    CreateWorkflowService,
    BlockProcessor,
    WorkflowProcessorService,
    BlockDiscoveryService,
    BlockConfigCacheService,
    WorkflowMemoryMonitorService,
    ExecutionScope,
    ToolExecutionService,
    DocumentPersistenceService,
    DocumentRepositoryService,
    WorkflowOrchestrationService,
    TransitionResolverService,
    DOCUMENT_REPOSITORY,
    FRAMEWORK_CONTEXT,
    WORKFLOW_ORCHESTRATOR,
    TEMPLATE_RENDERER,
  ],
})
export class WorkflowProcessorModule {}
