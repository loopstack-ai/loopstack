import { WorkflowMementoData } from './workflow-memento-data.interfate';

export interface WorkflowStateInterface<TState, TData> {
  get<K extends keyof TState>(key: K): TState[K];
  set<K extends keyof TState>(key: K, value: TState[K]): void;
  update(partial: Partial<TState>): void;
  getAll(): Readonly<TState>;

  getAllData(): Readonly<TData>;
  getData<K extends keyof TData>(key: K): TData[K];
  setData<K extends keyof TData>(key: K, value: TData[K]): void;
  updateData(partial: Partial<TData>): void;

  checkpoint(): void;
  serialize(): WorkflowMementoData<TState, TData>[];
  getHistory(): WorkflowMementoData<TState, TData>[];
  restoreToLatest(): boolean;
}
