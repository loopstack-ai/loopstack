import { z } from 'zod';
import type { WorkflowMementoData, WorkflowStateInterface } from '@loopstack/common';
import { StateCaretaker } from './state-caretaker';

export class StateManager<TState = any, TData = any> implements WorkflowStateInterface<TState, TData> {
  private state: TState;
  private data: TData;
  private version: number;
  private caretaker: StateCaretaker<TState, TData>;

  constructor(
    private readonly schema: z.ZodType<TState> | undefined,
    data: TData,
    history: WorkflowMementoData<TState, TData>[] | null,
  ) {
    this.state = {} as TState;
    this.data = data;
    this.version = 1;

    this.caretaker = StateCaretaker.deserialize<TState, TData>(history, schema);
    this.restoreToLatest();
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

  // Checkpoint at a named step
  checkpoint(): void {
    const memento: WorkflowMementoData<TState, TData> = {
      state: { ...this.state },
      data: { ...this.data },
      timestamp: new Date(),
      version: this.version++,
    };
    this.caretaker.save(memento);
  }

  serialize(): WorkflowMementoData<TState, TData>[] {
    return this.caretaker.serialize();
  }

  getHistory(): WorkflowMementoData<TState, TData>[] {
    return this.caretaker.getHistory();
  }

  restoreToLatest(): boolean {
    const memento = this.caretaker.getLatest();
    if (!memento) return false;

    this.state = this.schema ? this.schema.parse(memento.state) : memento.state;
    this.data = memento.data;
    this.version = memento.version + 1;
    return true;
  }
}
