import {
  BlockInterface,
  ContextMetadata,
  InputMetadata,
  RunContext,
  RuntimeMetadata,
  StateMetadata,
  WorkflowInterface,
  WorkflowMetadataInterface,
  getBlockContextMetadata,
  getBlockInputMetadata,
  getBlockRuntimeMetadata,
  getBlockStateMetadata,
} from '@loopstack/common';
import { StateManager } from './state/state-manager';
import { wrapBlockProxy } from './wrap-block-proxy';

export type WorkflowExecutionContextManager = ExecutionContextManager<any, any, WorkflowMetadataInterface>;

export type InstanceMetadataInfo = {
  state?: StateMetadata;
  args?: InputMetadata;
  context?: ContextMetadata;
  runtime?: RuntimeMetadata;
};

export class ExecutionContextManager<TInput = any, TState = any, TMetadata = any> {
  protected _wrappedInstance: WorkflowInterface;
  protected _blockMetadata: InstanceMetadataInfo;

  constructor(
    instance: BlockInterface,
    private readonly _context: RunContext,
    private readonly _args: TInput,
    private readonly _stateManager?: StateManager<TState, TMetadata>,
  ) {
    const stateMeta = getBlockStateMetadata(instance.constructor);
    const argsMeta = getBlockInputMetadata(instance.constructor);
    const contextMeta = getBlockContextMetadata(instance.constructor);
    const runtimeMeta = getBlockRuntimeMetadata(instance.constructor);

    this._blockMetadata = {
      state: stateMeta,
      args: argsMeta,
      context: contextMeta,
      runtime: runtimeMeta,
    };

    this._wrappedInstance = wrapBlockProxy(instance, this);
  }

  getArgs(): Readonly<TInput> {
    return Object.freeze({ ...this._args });
  }

  getContext(): RunContext {
    return Object.freeze({ ...this._context });
  }

  getMetadata(): InstanceMetadataInfo {
    return this._blockMetadata;
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
