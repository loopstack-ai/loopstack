import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
import { ClientMessageService } from './common/services/client-message.service.js';
import { WorkflowCheckpointService, WorkflowService, WorkspaceService } from './persistence/services/index.js';
import type { RedisOptions } from './scheduler/interfaces/redis-options.interface.js';
import { TaskSchedulerService } from './scheduler/services/task-scheduler.service.js';
import { TaskQueueModule } from './scheduler/task-queue.module.js';
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
} from './workflow-processor/services/index.js';
import { ExecutionScope, TemplateRenderer } from './workflow-processor/utils/index.js';

export interface LoopCoreModuleOptions {
  connection?: string;
  redis?: RedisOptions;
}

const ENTITIES = [
  WorkflowEntity,
  DocumentEntity,
  WorkspaceEntity,
  WorkspaceEnvironmentEntity,
  WorkflowCheckpointEntity,
];

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
      get config() {
        return scope.get().getConfig();
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
  BlockDiscoveryService,
  BlockConfigCacheService,
  WorkflowMemoryMonitorService,
  ExecutionScope,
  ToolExecutionService,
  DocumentPersistenceService,
  DocumentRepositoryService,
  WorkflowOrchestrationService,
  TransitionResolverService,

  // Framework injection tokens
  DOCUMENT_REPOSITORY,
  FRAMEWORK_CONTEXT,
  WORKFLOW_ORCHESTRATOR,
  TEMPLATE_RENDERER,
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
