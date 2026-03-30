import { z } from 'zod';
import type { WorkflowStateInterface } from '@loopstack/common';

export interface CheckpointState<TState> {
  state: TState;
  tools: Record<string, unknown>;
  version: number;
}

export class StateManager<TState = any, TData = any> implements WorkflowStateInterface<TState, TData> {
  private state: TState;
  private data: TData;
  private version: number;

  constructor(
    private readonly schema: z.ZodType<TState> | undefined,
    data: TData,
    checkpoint: CheckpointState<TState> | null,
  ) {
    this.state = {} as TState;
    this.data = data;
    this.version = 1;

    if (checkpoint) {
      this.state = this.schema ? this.schema.parse(checkpoint.state) : checkpoint.state;
      this.version = checkpoint.version + 1;

      // Restore tools from checkpoint into data
      if (checkpoint.tools && typeof this.data === 'object' && this.data !== null) {
        (this.data as Record<string, unknown>)['tools'] = checkpoint.tools;
      }
    }
  }

  get<K extends keyof TState>(key: K): TState[K] {
    return this.state[key];
  }

  set<K extends keyof TState>(key: K, value: TState[K]): void {
    const newState = {
      ...this.state,
      [key]: value,
    };
    this.state = this.schema ? this.schema.parse(newState) : newState;
  }

  setState(state: TState): void {
    this.state = state;
  }

  update(partial: Partial<TState>): void {
    const newState = {
      ...this.state,
      ...partial,
    };
    this.state = this.schema ? this.schema.parse(newState) : newState;
  }

  getAll(): Readonly<TState> {
    return Object.freeze({ ...this.state });
  }

  getAllData(): Readonly<TData> {
    return Object.freeze({ ...this.data });
  }

  getData<K extends keyof TData>(key: K): TData[K] {
    const value = this.data[key];
    if (value !== null && typeof value === 'object') {
      return structuredClone(value);
    }
    return value;
  }

  setData<K extends keyof TData>(key: K, value: TData[K]): void {
    this.data[key] = value;
  }

  updateData(partial: Partial<TData>): void {
    this.data = {
      ...this.data,
      ...partial,
    };
  }

  checkpoint(): void {
    this.version++;
  }

  getVersion(): number {
    return this.version;
  }
}
