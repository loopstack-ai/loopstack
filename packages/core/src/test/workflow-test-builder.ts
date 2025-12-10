import { TestingModule } from '@nestjs/testing';
import { Type } from '@nestjs/common';
import { WorkflowEntity, WorkflowState } from '@loopstack/common';
import { createTestingModule } from './create-testing-module';
import { WorkflowService } from '../persistence';
import { createToolMock, ToolMock } from './tool-test-builder';

export const DEFAULT_WORKFLOW_ENTITY: Omit<WorkflowEntity, 'namespace'> = {
  id: '00000000-0000-0000-0000-000000000000',
  blockName: '',
  title: '',
  index: '1',
  progress: 0,
  status: WorkflowState.Pending,
  hasError: false,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  place: 'start',
  transitionResults: null,
  inputData: {},
  availableTransitions: null,
  history: null,
  schema: null,
  error: null,
  ui: null,
  namespaceId: '',
  pipelineId: '',
  labels: [],
  hashRecord: null,
  createdBy: '',
  documents: [],
  dependencies: [],
};

/**
 * Mock for WorkflowService
 */
export interface WorkflowServiceMock {
  save: jest.Mock;
  create: jest.Mock;
  findOneByQuery: jest.Mock;
}

/**
 * Creates a standard WorkflowService mock
 */
export function createWorkflowServiceMock(): WorkflowServiceMock {
  return {
    save: jest.fn(),
    create: jest.fn().mockImplementation((input) =>
      Promise.resolve({
        ...DEFAULT_WORKFLOW_ENTITY,
        ...input,
        id: crypto.randomUUID(),
      })
    ),
    findOneByQuery: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Builder for creating workflow test modules
 *
 * @example
 * ```typescript
 * const module = await createWorkflowTest()
 *   .forWorkflow(CustomToolExampleWorkflow)
 *   .withImports(LoopCoreModule, CoreToolsModule)
 *   .withToolMock(MathSumTool)
 *   .withToolOverride(CreateChatMessage)
 *   .compile();
 *
 * const workflow = module.get(CustomToolExampleWorkflow);
 * const processor = module.get(WorkflowProcessorService);
 * ```
 */
export class WorkflowTestBuilder<TWorkflow = any> {
  private imports: any[] = [];
  private providers: any[] = [];
  private overrides = new Map<any, any>();
  private workflowClass?: Type<TWorkflow>;
  private workflowServiceMock: WorkflowServiceMock;
  private existingWorkflowEntity?: Partial<WorkflowEntity>;

  constructor() {
    this.workflowServiceMock = createWorkflowServiceMock();
  }

  /**
   * Set the workflow class to test
   */
  forWorkflow<T>(workflowClass: Type<T>): WorkflowTestBuilder<T> {
    this.workflowClass = workflowClass as any;
    this.providers.push(workflowClass);
    return this as unknown as WorkflowTestBuilder<T>;
  }

  /**
   * Add module imports
   */
  withImports(...imports: any[]): this {
    this.imports.push(...imports);
    return this;
  }

  /**
   * Add real providers (services, dependencies)
   */
  withProvider(...providers: Type<any>[]): this {
    this.providers.push(...providers);
    return this;
  }

  /**
   * Add multiple providers at once
   */
  withProviders(...providers: any[]): this {
    this.providers.push(...providers);
    return this;
  }

  /**
   * Mock a provider with a specific value
   * Use for providers defined in local providers array
   */
  withMock<T>(token: Type<T> | string | symbol, mock: Partial<T> | any): this {
    this.providers.push({
      provide: token,
      useValue: mock,
    });
    return this;
  }

  /**
   * Override a provider from an imported module
   * Use for providers that come from imported modules
   */
  withOverride<T>(token: Type<T> | string | symbol, mock: Partial<T> | any): this {
    this.overrides.set(token, mock);
    return this;
  }

  /**
   * Mock a tool with a standard tool mock (validate + execute)
   * Adds to local providers - use withToolOverride for tools from imported modules
   */
  withToolMock<T>(toolClass: Type<T>): this {
    const mock = createToolMock();
    this.providers.push({
      provide: toolClass,
      useValue: mock,
    });
    return this;
  }

  /**
   * Override a tool from an imported module with a standard tool mock
   * Use for tools that come from imported modules
   */
  withToolOverride<T>(toolClass: Type<T>): this {
    const mock = createToolMock();
    this.overrides.set(toolClass, mock);
    return this;
  }

  /**
   * Configure findOneByQuery to return an existing workflow entity
   * Use to test resuming from an existing workflow state
   */
  withExistingWorkflow(entity: Partial<WorkflowEntity>): this {
    this.existingWorkflowEntity = entity;
    return this;
  }

  /**
   * Build and compile the testing module
   */
  async compile(): Promise<TestingModule> {
    if (this.existingWorkflowEntity) {
      this.workflowServiceMock.findOneByQuery.mockResolvedValue({
        ...DEFAULT_WORKFLOW_ENTITY,
        id: crypto.randomUUID(),
        ...this.existingWorkflowEntity,
      });
    }

    let builder = createTestingModule({
      imports: this.imports,
      providers: this.providers,
    });

    // Apply WorkflowService override
    builder = builder
      .overrideProvider(WorkflowService)
      .useValue(this.workflowServiceMock);

    // Apply all other overrides
    for (const [token, mock] of this.overrides) {
      builder = builder.overrideProvider(token).useValue(mock);
    }

    const module = await builder.compile();
    await module.init();

    return module;
  }
}

/**
 * Create a new workflow test builder
 *
 * @example
 * ```typescript
 * const module = await createWorkflowTest()
 *   .forWorkflow(CustomToolExampleWorkflow)
 *   .withImports(LoopCoreModule)
 *   .withToolMock(MathSumTool)
 *   .compile();
 * ```
 */
export function createWorkflowTest(): WorkflowTestBuilder {
  return new WorkflowTestBuilder();
}