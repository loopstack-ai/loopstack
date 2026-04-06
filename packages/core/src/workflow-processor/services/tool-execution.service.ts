import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import {
  BaseTool,
  DocumentEntity,
  TOOL_INTERCEPTOR_METADATA_KEY,
  ToolExecutionContext,
  ToolInterceptor,
  ToolResult,
  ToolSideEffects,
  getBlockArgsSchema,
  getBlockTools,
} from '@loopstack/common';
import { ExecutionScope, WorkflowExecutionContextManager, wrapToolProxy } from '../utils';

/**
 * Executes tools by wrapping them in proxies that add framework logic.
 *
 * During wireAndProxyTool(), each tool is wrapped in a Proxy (via wrapToolProxy)
 * that intercepts call() and routes through executeCall(). This adds validation,
 * interceptor chain, and side-effect processing transparently.
 *
 * Interceptors are discovered automatically at module init — any @Injectable() class
 * marked with @UseToolInterceptor() is picked up via NestJS DiscoveryService.
 * Ordering is controlled by priority (lower = runs first / outermost).
 */
@Injectable()
export class ToolExecutionService implements OnModuleInit {
  private readonly logger = new Logger(ToolExecutionService.name);

  /** Tracks which tool instances have already been proxied (idempotent wiring) */
  private readonly proxiedTools = new WeakSet<object>();

  /** Discovered interceptors, sorted by priority (lowest first = outermost in chain) */
  private interceptors: ToolInterceptor[] = [];

  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly discoveryService: DiscoveryService,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    const discovered: { instance: ToolInterceptor; priority: number }[] = [];

    for (const wrapper of providers) {
      if (!wrapper.metatype || !wrapper.instance) continue;
      const meta = Reflect.getMetadata(TOOL_INTERCEPTOR_METADATA_KEY, wrapper.metatype) as
        | { priority: number }
        | undefined;
      if (meta) {
        discovered.push({ instance: wrapper.instance as ToolInterceptor, priority: meta.priority });
      }
    }

    // Sort by priority: lower number = outermost (runs first)
    discovered.sort((a, b) => a.priority - b.priority);
    this.interceptors = discovered.map((d) => d.instance);

    this.logger.log(
      `Discovered ${this.interceptors.length} tool interceptor(s): ${this.interceptors.map((i) => i.constructor.name).join(', ')}`,
    );
  }

  /**
   * Framework wrapper around a tool's call(). Called by the tool proxy.
   *
   * Flow:
   * 1. Validate args (framework guarantee — always runs)
   * 2. Run interceptor chain (user-configurable)
   * 3. Process side effects (framework guarantee — always runs)
   */
  /* eslint-disable @typescript-eslint/no-unsafe-function-type --
     originalCallFn is the tool's call() method retrieved dynamically from the prototype chain. */
  async executeCall(
    rawTool: object,
    originalCallFn: Function,
    args: Record<string, unknown>,
    proxy: object,
  ): Promise<ToolResult> {
    const baseTool = rawTool as BaseTool;
    const ctx = this.executionScope.get();

    // 1. Validate args (framework guarantee)
    const schema = getBlockArgsSchema(baseTool as object);
    const validArgs = schema ? (schema.parse(args) as Record<string, unknown>) : args;

    // 2. Build execution context
    const execContext: ToolExecutionContext = {
      tool: baseTool,
      args: validArgs,
      runContext: ctx.getContext(),
      metadata: {},
    };

    // 3. Build interceptor chain — each interceptor wraps the next, innermost is the tool call
    const toolCall = () => originalCallFn.call(proxy, validArgs) as Promise<ToolResult>;

    const chain = this.interceptors.reduceRight<() => Promise<ToolResult>>(
      (next, interceptor) => () => interceptor.intercept(execContext, next),
      toolCall,
    );

    const result = await chain();
    /* eslint-enable @typescript-eslint/no-unsafe-function-type */

    // 4. Process side effects (framework guarantee)
    if (result.effects) {
      this.processEffects(ctx, result.effects);
    }

    return result;
  }

  /**
   * Wraps a tool instance in a proxy. Returns the proxy.
   * Also recursively proxies nested @InjectTool() dependencies.
   */
  wireAndProxyTool(tool: object, toolName: string): object {
    // Already proxied (singleton reused across workflow runs) — return as-is
    if (this.proxiedTools.has(tool)) {
      return tool;
    }

    const proxy = wrapToolProxy(tool, toolName, this.executionScope, this.executeCall.bind(this));
    this.proxiedTools.add(proxy);

    // Recursively wire nested @InjectTool() dependencies
    const nestedToolNames = getBlockTools(tool);
    for (const nestedName of nestedToolNames) {
      const nestedTool = (tool as Record<string, unknown>)[nestedName] as object | undefined;
      if (nestedTool && !this.proxiedTools.has(nestedTool)) {
        const nestedProxy = this.wireAndProxyTool(nestedTool, nestedName);
        (tool as Record<string, unknown>)[nestedName] = nestedProxy;
      }
    }

    return proxy;
  }

  private processEffects(ctx: WorkflowExecutionContextManager, effects: ToolSideEffects[]): void {
    for (const effect of effects) {
      if (effect.addWorkflowDocuments?.length) {
        this.addDocuments(ctx, effect.addWorkflowDocuments);
      }
    }
  }

  private addDocuments(ctx: WorkflowExecutionContextManager, documents: DocumentEntity[]): void {
    for (const document of documents) {
      const existingDocs = ctx.getManager().getData('documents');
      const existingIndex = document.id ? existingDocs.findIndex((d) => d.id === document.id) : -1;

      if (existingIndex !== -1) {
        this.updateDocument(ctx, existingIndex, document);
      } else {
        this.addDocument(ctx, document);
      }
    }
  }

  private updateDocument(ctx: WorkflowExecutionContextManager, index: number, document: DocumentEntity): void {
    const documents = ctx.getManager().getData('documents');
    document.index = index;
    if (index !== -1) {
      documents[index] = document;
    }
    ctx.getManager().setData('documents', documents);
    ctx.getManager().setData('persistenceState', { documentsUpdated: true });
  }

  private addDocument(ctx: WorkflowExecutionContextManager, document: DocumentEntity): void {
    const documents = ctx.getManager().getData('documents');
    let inheritedIndex: number | undefined;
    for (const doc of documents) {
      if (doc.messageId === document.messageId && doc.meta?.invalidate !== false) {
        if (inheritedIndex === undefined) {
          inheritedIndex = doc.index;
        }
        doc.isInvalidated = true;
      }
    }

    document.index = inheritedIndex ?? documents.length;
    this.logger.debug(
      `addDocument: ${document.blockName}(messageId=${document.messageId}) → index=${document.index} (inherited=${inheritedIndex !== undefined}, docCount=${documents.length})`,
    );
    documents.push(document);
    ctx.getManager().setData('documents', documents);
    ctx.getManager().setData('persistenceState', { documentsUpdated: true });
  }
}
