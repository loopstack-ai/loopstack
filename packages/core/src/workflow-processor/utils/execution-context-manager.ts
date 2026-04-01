import { BlockInterface, RunContext, WorkflowInterface, WorkflowMetadataInterface } from '@loopstack/common';
import { StateManager } from './state/state-manager';
import { wrapBlockProxy } from './wrap-block-proxy';

export type WorkflowExecutionContextManager = ExecutionContextManager<
  Record<string, unknown> | undefined,
  Record<string, unknown>,
  WorkflowMetadataInterface
>;

export class ExecutionContextManager<TInput = any, TState = any, TMetadata = any> {
  protected _wrappedInstance: WorkflowInterface;

  constructor(
    instance: BlockInterface,
    private readonly _context: RunContext,
    private readonly _args: TInput,
    private readonly _stateManager?: StateManager<TState, TMetadata>,
  ) {
    this._wrappedInstance = wrapBlockProxy(instance, this);
  }

  getArgs(): Readonly<TInput> {
    return Object.freeze({ ...this._args });
  }

  getContext(): RunContext {
    return Object.freeze({ ...this._context });
  }

  getInstance(): WorkflowInterface {
    return this._wrappedInstance;
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
