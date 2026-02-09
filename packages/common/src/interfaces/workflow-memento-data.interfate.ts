export interface WorkflowMementoData<TState, TData> {
  state: Readonly<TState>;
  data: Readonly<TData>;
  timestamp: Date;
  version: number;
}
