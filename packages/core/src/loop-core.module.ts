import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DOCUMENT_STORE,
  DocumentEntity,
  EXECUTION_SCOPE,
  FEATURE_REGISTRY,
  TEMPLATE_RENDERER,
  TOOL_PIPELINE,
  TOOL_REGISTRY,
  WORKFLOW_ORCHESTRATOR,
  WorkflowCheckpointEntity,
  WorkflowEntity,
  WorkspaceEntity,
} from '@loopstack/common';
import { ClientMessageService } from './common/services/client-message.service.js';
import { WorkflowCheckpointService, WorkflowService, WorkspaceService } from './persistence/services/index.js';
import type { RedisOptions } from './scheduler/interfaces/redis-options.interface.js';
import { TaskSchedulerService } from './scheduler/services/task-scheduler.service.js';
import { TaskQueueModule } from './scheduler/task-queue.module.js';
import {
  BlockProcessor,
  CreateWorkflowService,
  DocumentPersistenceService,
  DocumentStore,
  FeatureRegistryService,
  ProcessorFactory,
  RootProcessorService,
  StudioDiscoveryService,
  ToolLoggingInterceptor,
  ToolPipelineService,
  TransitionResolverService,
  WorkflowMemoryMonitorService,
  WorkflowOrchestrationService,
  WorkflowProcessorService,
  WorkflowRegistryService,
  WorkflowStateService,
  ToolRegistryService,
} from './workflow-processor/services/index.js';
import { ExecutionScope, TemplateRenderer } from './workflow-processor/utils/index.js';

export interface LoopCoreModuleOptions {
  connection?: string;
  redis?: RedisOptions;
}

const ENTITIES = [WorkflowEntity, DocumentEntity, WorkspaceEntity, WorkflowCheckpointEntity];

const PROVIDERS = [
  // Common
  ClientMessageService,

  // Persistence
  WorkflowService,
  WorkspaceService,
  WorkflowCheckpointService,

  // Workflow engine
  RootProcessorService,
  BlockProcessor,
  ProcessorFactory,
  WorkflowProcessorService,
  WorkflowStateService,
  WorkflowMemoryMonitorService,
  CreateWorkflowService,
  ExecutionScope,
  DocumentPersistenceService,
  DocumentStore,
  WorkflowOrchestrationService,
  TransitionResolverService,
  ToolLoggingInterceptor,
  ToolPipelineService,
  TemplateRenderer,
  WorkflowRegistryService,
  StudioDiscoveryService,
  FeatureRegistryService,
  ToolRegistryService,

  // Framework injection tokens (consumed by BaseTool / BaseWorkflow via @Inject)
  {
    provide: TOOL_PIPELINE,
    useExisting: ToolPipelineService,
  },
  {
    provide: DOCUMENT_STORE,
    useExisting: DocumentStore,
  },
  {
    provide: EXECUTION_SCOPE,
    useExisting: ExecutionScope,
  },
  {
    provide: WORKFLOW_ORCHESTRATOR,
    useExisting: WorkflowOrchestrationService,
  },
  {
    provide: TEMPLATE_RENDERER,
    useFactory: (renderer: TemplateRenderer) => renderer.render,
    inject: [TemplateRenderer],
  },
  {
    provide: FEATURE_REGISTRY,
    useExisting: FeatureRegistryService,
  },
  {
    provide: TOOL_REGISTRY,
    useExisting: ToolRegistryService,
  },
];

const EXPORTS = [
  // Common
  ClientMessageService,

  // Persistence
  WorkflowService,
  WorkspaceService,
  WorkflowCheckpointService,

  // Scheduler (re-exported from TaskQueueModule)
  TaskQueueModule,

  // Workflow engine
  RootProcessorService,
  CreateWorkflowService,
  BlockProcessor,
  WorkflowProcessorService,
  WorkflowMemoryMonitorService,
  ExecutionScope,
  DocumentPersistenceService,
  DocumentStore,
  WorkflowOrchestrationService,
  TransitionResolverService,
  ToolPipelineService,
  TemplateRenderer,
  WorkflowRegistryService,
  StudioDiscoveryService,
  FeatureRegistryService,
  ToolRegistryService,

  // Framework injection tokens
  WORKFLOW_ORCHESTRATOR,
  TEMPLATE_RENDERER,
  TOOL_PIPELINE,
  EXECUTION_SCOPE,
  DOCUMENT_STORE,
  FEATURE_REGISTRY,
  TOOL_REGISTRY,
];

const MOCK_TASK_SCHEDULER: Provider = {
  provide: TaskSchedulerService,
  useValue: {
    addTask: async () => null,
    removeTasksByWorkflowId: async () => 0,
    clearAllTasks: async () => undefined,
  },
};

const TESTING_EXPORTS = EXPORTS.filter((e) => e !== TaskQueueModule);

@Global()
@Module({})
export class LoopCoreModule {
  static forRoot(options: LoopCoreModuleOptions = {}): DynamicModule {
    return {
      module: LoopCoreModule,
      global: true,
      imports: [
        TypeOrmModule.forFeature(ENTITIES, options.connection),
        ConfigModule,
        EventEmitterModule.forRoot(),
        DiscoveryModule,
        TaskQueueModule.forRoot(options.redis),
      ],
      providers: PROVIDERS,
      exports: EXPORTS,
    };
  }

  static forTesting(): DynamicModule {
    return {
      module: LoopCoreModule,
      global: true,
      imports: [TypeOrmModule.forFeature(ENTITIES), ConfigModule, EventEmitterModule.forRoot(), DiscoveryModule],
      providers: [...PROVIDERS, MOCK_TASK_SCHEDULER],
      exports: [...TESTING_EXPORTS, TaskSchedulerService],
    };
  }
}
