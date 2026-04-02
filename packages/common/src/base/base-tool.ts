import { Injectable } from '@nestjs/common';
import { RunContext } from '../dtos';
import { WorkflowInterface } from '../interfaces/block.interface';
import { ToolResult } from '../interfaces/handler.interface';
import { WorkflowMetadataInterface } from '../interfaces/workflow-metadata.interface';

/**
 * Base class for tools in the TypeScript-first workflow model.
 *
 * Tool authors extend this class and implement `run(args)`.
 *
 * Context is available through proxy-provided properties:
 * - `this.context`  — current RunContext
 * - `this.runtime`  — workflow metadata (documents, transition info, etc.)
 * - `this.parent`   — proxied workflow instance (for looking up sibling tools/documents)
 *
 * The workflow proxy intercepts `.run()` calls on injected tools and
 * redirects them to `_run()`, which routes through ToolExecutionService
 * for validation, interceptors, and context.
 */
@Injectable()
export class BaseTool<TArgs extends object = any, TData = any> {
  /** Provided by execution proxy — current run context */
  declare readonly context: RunContext;
  /** Provided by execution proxy — workflow metadata (documents, transition info, etc.) */
  declare readonly runtime: WorkflowMetadataInterface;
  /** Provided by execution proxy — parent workflow instance */
  declare readonly parent: WorkflowInterface;

  /**
   * Implement this with tool logic. Called by ToolExecutionService
   * after validation and interceptors.
   */
  run(_args: TArgs): Promise<ToolResult<TData>> {
    return Promise.reject(new Error(`${this.constructor.name}.run() is not implemented.`));
  }

  /**
   * Internal entry point wired by the workflow processor at runtime.
   * The proxy redirects .run() → ._run() → ToolExecutionService.
   */
  _run(_args: TArgs): Promise<ToolResult<TData>> {
    return Promise.reject(
      new Error(
        'BaseTool._run() was called but has not been wired. ' +
          'Ensure the tool is used within a workflow transition with an active ExecutionScope.',
      ),
    );
  }
}
