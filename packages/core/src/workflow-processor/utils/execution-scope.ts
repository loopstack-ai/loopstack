import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { QueryRunner } from 'typeorm';
import type { DocumentEntity } from '@loopstack/common';
import type { HistoryTransition } from '@loopstack/contracts/types';

/**
 * Data held in async-local-storage during a workflow transition.
 *
 * Read-only context fields are set once per `process()` call.
 * Mutable fields (queryRunner, documents, transition) are updated
 * by the processor before each transition execution.
 */
export interface ExecutionScopeData {
  // Read-only context
  userId: string;
  workspaceId: string;
  workflowId: string;
  labels: string[];
  args: Readonly<Record<string, unknown> | undefined>;
  options: { stateless: boolean };

  // Per-execution cache for scope-aware services (nestjs-cls pattern)
  cache: Map<symbol, Promise<unknown>>;

  // Mutable per-transition
  queryRunner: QueryRunner | null;
  documents: DocumentEntity[];
  persistenceState: { documentsUpdated: boolean };
  transition?: HistoryTransition;

  // Per-transition state/result drafts mutated by BaseWorkflow setters
  // (assignState / setState / assignResult / setResult). The processor seeds
  // these before invoking the transition method and commits them on success.
  stateDraft: Record<string, unknown>;
  resultDraft: Record<string, unknown>;
  resultDirty: boolean;
}

/**
 * Holds the current execution scope data for the duration of a transition.
 *
 * When workflow code calls `tool.call(args)`, the tool pipeline and document
 * services need access to the current execution context without it being passed
 * as a parameter. The processor sets the scope before calling a transition method;
 * anything called inside — tools, documents, sub-workflows — can read it via
 * `executionScope.get()`.
 */
@Injectable()
export class ExecutionScope {
  private storage = new AsyncLocalStorage<ExecutionScopeData>();

  run<T>(data: ExecutionScopeData, fn: () => Promise<T>): Promise<T>;
  run<T>(data: ExecutionScopeData, fn: () => T): T;
  run<T>(data: ExecutionScopeData, fn: () => T | Promise<T>): T | Promise<T> {
    return this.storage.run(data, fn);
  }

  get(): ExecutionScopeData {
    const data = this.storage.getStore();
    if (!data) {
      throw new Error('No active execution scope. Are you calling outside a transition?');
    }
    return data;
  }

  getOptional(): ExecutionScopeData | undefined {
    return this.storage.getStore();
  }

  /**
   * Get a cached value from the per-execution cache, or load it once.
   * The loader is called at most once per execution — subsequent calls return the same Promise.
   */
  getOrLoad<T>(key: symbol, loader: () => Promise<T>): Promise<T> {
    const store = this.storage.getStore();
    if (!store) throw new Error('No active execution scope. Are you calling outside a transition?');
    if (store.cache.has(key)) return store.cache.get(key) as Promise<T>;
    const promise = loader();
    store.cache.set(key, promise);
    return promise;
  }
}
