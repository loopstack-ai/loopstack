import { DynamicModule, ForwardReference, Provider, Type } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { type Mock, vi } from 'vitest';
import { RunContext, User, WorkflowEntity, WorkflowState } from '@loopstack/common';
import { LoopCoreModule, WorkflowService } from '@loopstack/core';
import { mockCoreModuleProviders } from './core-module-mock.js';
import { createTestingModule } from './create-testing-module.js';
import { createToolMock } from './tool-test-builder.js';

type ModuleImport = Type | DynamicModule | Promise<DynamicModule> | ForwardReference;

export const DEFAULT_WORKFLOW_ENTITY: Partial<WorkflowEntity> = {
  id: '00000000-0000-0000-0000-000000000000',
  alias: '',
  title: '',
  run: 1,
  status: WorkflowState.Pending,
  hasError: false,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  place: 'start',
  availableTransitions: null,
  args: {},
  context: {},
  callbackTransition: null,
  workspaceId: '',
  parentId: null,
  labels: [],
  hashRecord: null,
  createdBy: '',
  creator: {} as User,
  documents: [],
  result: null,
};

/**
 * Mock for WorkflowService
 */
export interface WorkflowServiceMock {
  save: Mock;
  create: Mock;
  findOneByQuery: Mock;
}

/**
 * Creates a standard WorkflowService mock
 */
export function createWorkflowServiceMock(mockEntity = {}): WorkflowServiceMock {
  return {
    save: vi.fn(),
    create: vi.fn().mockImplementation((input) =>
      Promise.resolve({
        ...DEFAULT_WORKFLOW_ENTITY,
        ...input,
        id: crypto.randomUUID(),
        ...mockEntity,
      }),
    ),
    findOneByQuery: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Builder for creating workflow test modules
 *
 * @example
 * ```typescript
 * const module = await createWorkflowTest()
 *   .forWorkflow(CustomToolExampleWorkflow)
 *   .withImports(LoopCoreModule.forRoot(), CoreToolsModule)
 *   .withToolMock(MathSumTool)
 *   .compile();
 *
 * const workflow = module.get(CustomToolExampleWorkflow);
 * const processor = module.get(WorkflowProcessorService);
 * ```
 */
export class WorkflowTestBuilder<TWorkflow = unknown> {
  private imports: ModuleImport[] = [];
  private providers: Provider[] = [];
  private overrides = new Map<any, any>();
  private workflowClass?: Type<TWorkflow>;
  private workflowServiceMock: WorkflowServiceMock;
  private module: TestingModule;

  constructor() {
    this.workflowServiceMock = createWorkflowServiceMock();
  }

  /**
   * Set the workflow class to test
   */
  forWorkflow<T>(workflowClass: Type<T>): WorkflowTestBuilder<T> {
    (this.workflowClass as Type<unknown> | undefined) = workflowClass;
    this.providers.push(workflowClass);
    return this as unknown as WorkflowTestBuilder<T>;
  }

  /**
   * Add module imports
   */
  withImports(...imports: ModuleImport[]): this {
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
  withProviders(...providers: Provider[]): this {
    this.providers.push(...providers);
    return this;
  }

  /**
   * Mock a provider with a specific value
   * Use for providers defined in local providers array
   */
  withMock<T>(token: Type<T> | string | symbol, mock: Partial<T>): this {
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
  withOverride<T>(token: Type<T> | string | symbol, mock: Partial<T>): this {
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
    this.workflowServiceMock = createWorkflowServiceMock(entity);
    return this;
  }

  /**
   * Build and compile the testing module
   */
  async compile(): Promise<TestingModule> {
    let builder = createTestingModule({
      imports: [LoopCoreModule.forTesting(), ...this.imports],
      providers: this.providers,
    });

    // Apply core overrides (TypeORM repos + BullMQ queue)
    builder = mockCoreModuleProviders(builder);

    // Apply WorkflowService override
    builder = builder.overrideProvider(WorkflowService).useValue(this.workflowServiceMock);

    // Apply custom overrides
    for (const [token, mock] of this.overrides) {
      builder = builder.overrideProvider(token).useValue(mock);
    }

    const module = await builder.compile();
    await module.init();

    return module;
  }
}

export function createWorkflowTest(): WorkflowTestBuilder {
  return new WorkflowTestBuilder();
}

export function createStatelessContext(overrides?: Partial<RunContext>): RunContext {
  return { options: { stateless: true }, ...overrides } as RunContext;
}
