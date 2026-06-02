import { Provider, Type } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type Mock, vi } from 'vitest';
import {
  BLOCK_CONFIG_METADATA_KEY,
  BaseTool,
  DOCUMENT_STORE,
  EXECUTION_SCOPE,
  TEMPLATE_RENDERER,
  TOOL_PIPELINE,
} from '@loopstack/common';

/**
 * Mock for Tool classes - provides standard jest mock functions
 */
export interface ToolMock {
  call: Mock;
}

/**
 * Creates a standard tool mock with a call function
 */
export function createToolMock(): ToolMock {
  return {
    call: vi.fn().mockResolvedValue({ data: undefined }),
  };
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
 * const result = await tool.call({ a: 1, b: 2 });
 * ```
 */
export class ToolTestBuilder<TTool extends BaseTool = BaseTool> {
  private toolClass?: Type<TTool>;
  private providers: Provider[] = [];
  private overrides = new Map<unknown, unknown>();

  /**
   * Set the tool class to test
   */
  forTool<T extends BaseTool>(toolClass: Type<T>): ToolTestBuilder<T> {
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
      providers: [
        {
          provide: TEMPLATE_RENDERER,
          useValue: vi.fn((template: string) => template),
        },
        {
          provide: DOCUMENT_STORE,
          useValue: {
            create: vi.fn(),
            save: vi.fn().mockResolvedValue({ id: 'doc-1' }),
            findAll: vi.fn().mockReturnValue([]),
            findAllDocuments: vi.fn().mockReturnValue([]),
            findByTag: vi.fn().mockReturnValue([]),
          },
        },
        {
          provide: EXECUTION_SCOPE,
          useValue: {
            get: vi.fn().mockReturnValue({
              userId: 'test-user',
              workspaceId: 'test-workspace',
              workflowId: 'test-workflow',

              args: undefined,
            }),
            getOptional: vi.fn().mockReturnValue({
              userId: 'test-user',
              workspaceId: 'test-workspace',
              workflowId: 'test-workflow',

              args: undefined,
            }),
            getOrLoad: vi.fn().mockImplementation((_key: symbol, loader: () => Promise<unknown>) => loader()),
          },
        },
        {
          provide: TOOL_PIPELINE,
          useValue: {
            execute: vi.fn().mockImplementation((tool: any, args: any, options: any) => {
              const ctx = {
                userId: 'test-user',
                workspaceId: 'test-workspace',
                workflowId: 'test-workflow',
                args: undefined,
              };
              return tool.handle(args ?? {}, ctx, options);
            }),
          },
        },
        ...this.providers,
      ],
    });

    // Apply overrides
    for (const [token, mock] of this.overrides) {
      builder = builder.overrideProvider(token).useValue(mock);
    }

    const module = await builder.compile();
    return module;
  }

  private verifyToolDecorators<T>(toolClass: Type<T>): void {
    const blockConfig: unknown = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, toolClass);
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
