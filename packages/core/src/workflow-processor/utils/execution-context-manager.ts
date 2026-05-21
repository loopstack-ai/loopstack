import { QueryRunner } from 'typeorm';
import {
  BaseApp,
  BlockInterface,
  RunContext,
  WorkflowInterface,
  WorkflowMetadataInterface,
  WorkflowRunContext,
} from '@loopstack/common';
import { StateManager } from './state/state-manager.js';
import { wrapAppProxy } from './wrap-app-proxy.js';
import { wrapBlockProxy } from './wrap-block-proxy.js';

export type WorkflowExecutionContextManager = ExecutionContextManager<
  Record<string, unknown> | undefined,
  Record<string, unknown>,
  WorkflowMetadataInterface
>;

export class ExecutionContextManager<TInput = any, TState = any, TMetadata = any> {
  protected _wrappedInstance: WorkflowInterface;
  private _queryRunner: QueryRunner | null = null;
  private _appProxy: BaseApp | undefined;

  constructor(
    instance: BlockInterface,
    private readonly _context: RunContext,
    private readonly _args: TInput,
    private readonly _stateManager?: StateManager<TState, TMetadata>,
    private readonly _config?: Record<string, unknown>,
  ) {
    this._wrappedInstance = wrapBlockProxy(instance, this);

    if (_context.appInstance) {
      this._appProxy = wrapAppProxy(_context.appInstance, _context);
    }
  }

  setQueryRunner(qr: QueryRunner | null): void {
    this._queryRunner = qr;
  }

  getQueryRunner(): QueryRunner | null {
    return this._queryRunner;
  }

  getArgs(): Readonly<TInput> {
    return Object.freeze({ ...this._args });
  }

  getConfig(): Readonly<Record<string, unknown> | undefined> {
    return this._config ? Object.freeze({ ...this._config }) : undefined;
  }

  getContext(): RunContext {
    return Object.freeze({ ...this._context });
  }

  getInstance(): WorkflowInterface {
    return this._wrappedInstance;
  }

  /** Returns the proxied app instance with execution context properties (userId, workspaceId, environments). */
  getAppProxy(): BaseApp {
    if (!this._appProxy) {
      // Stateless runs or runs without an app — return a minimal context object
      return {
        userId: this._context.userId,
        workspaceId: this._context.workspaceId,
        environments: this._context.workspaceEnvironments ?? [],
      } as BaseApp;
    }
    return this._appProxy;
  }

  /** Returns the per-run execution context including workflow args and config. */
  getRunContext(): WorkflowRunContext {
    return Object.freeze({
      workflowId: this._context.workflowId,
      root: this._context.root,
      labels: this._context.labels,
      payload: this._context.payload,
      context: this._context.workflowContext,
      entity: this._context.workflowEntity,
      options: this._context.options,
      args: this._args ? Object.freeze({ ...this._args }) : undefined,
      config: this._config ? Object.freeze({ ...this._config }) : undefined,
    });
  }

  getManager(): StateManager<TState, TMetadata> {
    if (!this._stateManager) {
      throw new Error(`Context has no state manager.`);
    }
    return this._stateManager;
  }

  getData(): Readonly<TMetadata> {
    return this.getManager().getAllData();
  }

  getState(): Readonly<TState> {
    return Object.freeze({ ...this.getManager().getAll() });
  }

  setState(newState: TState): void {
    this.getManager().setState(newState);
  }
}
