import { Injectable, Logger } from '@nestjs/common';
import {
  BaseDocument,
  BaseTool,
  BaseWorkflow,
  DocumentEntity,
  LaunchWorkflowOptions,
  ToolExecutionContext,
  ToolResult,
  ToolSideEffects,
  getBlockArgsSchema,
  getBlockDocuments,
  getBlockTools,
  getBlockWorkflows,
} from '@loopstack/common';
import { ExecutionScope, WorkflowExecutionContextManager } from '../utils';
import { DocumentCreateOptions, DocumentPersistenceService } from './document-persistence.service';
import { ToolExecutionInterceptorService } from './tool-execution-interceptor.service';
import { WorkflowOrchestrationService } from './workflow-orchestration.service';

/**
 * Executes tools called from the TypeScript-first workflow model.
 *
 * All tools implement `run(args)`. Context (RunContext, metadata, parent workflow)
 * is available inside `run()` via proxy-provided properties:
 * - `this.context`  → RunContext
 * - `this.runtime`  → WorkflowMetadataInterface
 * - `this.parent`   → proxied workflow instance
 *
 * Injected sibling tools/documents accessed via `this.<tool>` are automatically
 * sub-proxied: `.run()` routes through ToolExecutionService and `.create()` through DocumentPersistenceService.
 */
@Injectable()
export class ToolExecutionService {
  private readonly logger = new Logger(ToolExecutionService.name);

  constructor(
    private readonly executionScope: ExecutionScope,
    private readonly interceptorService: ToolExecutionInterceptorService,
    private readonly documentPersistenceService: DocumentPersistenceService,
    private readonly workflowOrchestrationService: WorkflowOrchestrationService,
  ) {}

  async execute(tool: BaseTool, args: Record<string, unknown>): Promise<ToolResult> {
    const ctx = this.executionScope.get();

    // 1. Validate args
    const schema = getBlockArgsSchema(tool as object);
    const validArgs = schema ? (schema.parse(args) as Record<string, unknown>) : args;

    // 2. Build execution context for interceptors
    const execContext: ToolExecutionContext = {
      tool,
      args: validArgs,
      runContext: ctx.getContext(),
    };

    // 3. Before interceptors
    await this.interceptorService.beforeExecute(execContext);

    // 4. Execute the tool via proxy
    const proxiedTool = this.createToolProxy(tool, ctx);
    const startTime = performance.now();
    let result: ToolResult;
    try {
      result = await proxiedTool.run(validArgs);
    } catch (error) {
      execContext.metrics = { durationMs: Math.round(performance.now() - startTime) };
      await this.interceptorService.onError(execContext, error);
      throw error;
    }
    execContext.metrics = { durationMs: Math.round(performance.now() - startTime) };

    // 5. After interceptors
    await this.interceptorService.afterExecute(execContext, result);

    // 6. Process side effects (documents)
    if (result.effects) {
      this.processEffects(ctx, result.effects);
    }

    return result;
  }

  /**
   * Wraps a tool instance in a Proxy that provides execution context
   * and redirects injected tool/document method calls.
   *
   * For injected tools, .run() is routed through ToolExecutionService.execute()
   * rather than ._run(), because nested tools (tools injected into other tools)
   * don't have ._run() wired — only top-level workflow tools do.
   */
  private createToolProxy(tool: BaseTool, ctx: WorkflowExecutionContextManager): BaseTool {
    const toolProps = new Set(getBlockTools(tool.constructor));
    const documentProps = new Set(getBlockDocuments(tool.constructor));
    const workflowProps = new Set(getBlockWorkflows(tool.constructor));
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const executionService = this;

    return new Proxy(tool, {
      get(target, prop, receiver) {
        // Proxy-provided context properties
        if (prop === 'context') return ctx.getContext();
        if (prop === 'runtime') return ctx.getData();
        if (prop === 'parent') return ctx.getInstance();

        const value = Reflect.get(target, prop, receiver) as unknown;

        // Sub-proxy for injected tools: route .run() through ToolExecutionService
        if (toolProps.has(prop as string) && value != null && typeof value === 'object') {
          const nestedTool = value as BaseTool;
          return new Proxy(nestedTool, {
            get(t, p, r) {
              if (p === 'run') {
                return (args: Record<string, unknown>) => executionService.execute(nestedTool, args);
              }
              return Reflect.get(t, p, r);
            },
          });
        }

        // Sub-proxy for injected documents: route .create() through DocumentPersistenceService
        if (documentProps.has(prop as string) && value != null && typeof value === 'object') {
          const docInstance = value as BaseDocument;
          const blockName = prop as string;
          return new Proxy(docInstance, {
            get(t, p, r) {
              if (p === 'create') {
                return (options: DocumentCreateOptions) =>
                  Promise.resolve(executionService.documentPersistenceService.create(blockName, docInstance, options));
              }
              return Reflect.get(t, p, r);
            },
          });
        }

        // Sub-proxy for injected sub-workflows: route .run() through WorkflowOrchestrationService
        if (workflowProps.has(prop as string) && value != null && typeof value === 'object') {
          const subWorkflow = value as BaseWorkflow;
          const blockName = prop as string;
          return new Proxy(subWorkflow, {
            get(t, p, r) {
              if (p === 'run') {
                return (options?: LaunchWorkflowOptions) =>
                  executionService.workflowOrchestrationService.launch(blockName, subWorkflow, options ?? {});
              }
              return Reflect.get(t, p, r);
            },
          });
        }

        return value;
      },
    });
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
