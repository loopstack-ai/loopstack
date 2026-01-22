import { Provider, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { merge } from 'lodash';
import { BLOCK_METADATA_KEY } from '@loopstack/common';
import { ToolBase, WorkflowExecution } from '@loopstack/core';

/**
 * Mock for Tool classes - provides standard jest mock functions
 */
export interface ToolMock {
  validate: jest.Mock;
  execute: jest.Mock;
}

/**
 * Creates a standard tool mock with validate and execute functions
 */
export function createToolMock(): ToolMock {
  return {
    validate: jest.fn().mockImplementation((v: unknown) => v),
    execute: jest.fn().mockResolvedValue({ data: undefined }),
  };
}

/**
 * Creates a mock WorkflowExecution context for tool testing
 */
export function createExecutionContext(overrides?: Partial<WorkflowExecution>): WorkflowExecution {
  // const state = new Map<string, any>();
  // const metadata = new Map<string, any>([['documents', []]]);

  return merge(
    {
      // state: {
      //   get: (key: string) => state.get(key),
      //   getAll: () => Object.fromEntries(state),
      //   update: (data: any) => Object.entries(data).forEach(([k, v]) => state.set(k, v)),
      //   getMetadata: (key: string) => metadata.get(key),
      //   getAllMetadata: () => Object.fromEntries(metadata),
      //   setMetadata: (key: string, value: any) => metadata.set(key, value),
      //   updateMetadata: (data: any) => Object.entries(data).forEach(([k, v]) => metadata.set(k, v)),
      // },
      runtime: {
        error: false,
        stop: false,
        availableTransitions: [],
        transition: {
          id: 'test-transition',
          from: 'start',
          to: 'end',
        },
        persistenceState: { documentsUpdated: false },
      },
    },
    overrides,
  ) as WorkflowExecution;
}

/**
 * Builder for creating tool test modules
 *
 * @example
 * ```typescript
 * const module = await createToolTest()
 *   .forTool(MathSumTool)
 *   .withProvider(MathService)
 *   .compile();
 *
 * const tool = module.get(MathSumTool);
 * const result = await tool.execute(tool.validate({ a: 1, b: 2 }), createExecutionContext());
 * ```
 */
export class ToolTestBuilder<TTool extends ToolBase<object> = ToolBase<object>> {
  private toolClass?: Type<TTool>;
  private providers: Provider[] = [];
  private overrides = new Map<unknown, unknown>();

  /**
   * Set the tool class to test
   */
  forTool<T extends ToolBase<object>>(toolClass: Type<T>): ToolTestBuilder<T> {
    this.verifyToolDecorators(toolClass);
    (this.toolClass as Type<unknown> | undefined) = toolClass;
    this.providers.push(toolClass);
    return this as unknown as ToolTestBuilder<T>;
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
   */
  withMock<T>(token: Type<T> | string | symbol, mock: Partial<T>): this {
    this.providers.push({
      provide: token,
      useValue: mock,
    });
    return this;
  }

  /**
   * Override a provider (alternative syntax, same as withMock)
   */
  withOverride<T>(token: Type<T> | string | symbol, mock: Partial<T>): this {
    this.overrides.set(token, mock);
    return this;
  }

  /**
   * Mock a tool dependency with standard tool mock
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
   * Build and compile the testing module
   */
  async compile(): Promise<TestingModule> {
    if (!this.toolClass) {
      throw new Error('Tool class not set. Call forTool() first.');
    }

    let builder = Test.createTestingModule({
      providers: this.providers,
    });

    // Apply overrides
    for (const [token, mock] of this.overrides) {
      builder = builder.overrideProvider(token).useValue(mock);
    }

    const module = await builder.compile();
    return module;
  }

  private verifyToolDecorators<T>(toolClass: Type<T>): void {
    const blockConfig: unknown = Reflect.getMetadata(BLOCK_METADATA_KEY, toolClass);
    if (!blockConfig) {
      throw new Error(`Tool ${toolClass.name} is not decorated with @BlockConfig`);
    }
  }
}

/**
 * Create a new tool test builder
 *
 * @example
 * ```typescript
 * const module = await createToolTest()
 *   .forTool(MathSumTool)
 *   .withProvider(MathService)
 *   .compile();
 *
 * const tool = module.get(MathSumTool);
 * ```
 */
export function createToolTest(): ToolTestBuilder {
  return new ToolTestBuilder();
}
