import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { WorkflowExecutionContextManager } from './execution-context-manager';

/**
 * Holds the current ExecutionContextManager for the duration of a transition.
 *
 * When workflow code calls `this.tool.run(args)`, the base class needs access
 * to the current execution context (for interceptors, document management, etc.)
 * without passing it as a parameter. The processor sets the scope before calling
 * a transition method; anything called inside — tools, documents, sub-workflows —
 * can read it via `executionScope.get()`.
 */
@Injectable()
export class ExecutionScope {
  private storage = new AsyncLocalStorage<WorkflowExecutionContextManager>();

  run<T>(ctx: WorkflowExecutionContextManager, fn: () => Promise<T>): Promise<T>;
  run<T>(ctx: WorkflowExecutionContextManager, fn: () => T): T;
  run<T>(ctx: WorkflowExecutionContextManager, fn: () => T | Promise<T>): T | Promise<T> {
    return this.storage.run(ctx, fn);
  }

  get(): WorkflowExecutionContextManager {
    const ctx = this.storage.getStore();
    if (!ctx) {
      throw new Error('No active execution scope. Are you calling outside a transition?');
    }
    return ctx;
  }

  getOptional(): WorkflowExecutionContextManager | undefined {
    return this.storage.getStore();
  }
}
