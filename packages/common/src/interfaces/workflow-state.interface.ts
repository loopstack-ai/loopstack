import { z } from 'zod';
import { WorkflowMementoData } from './workflow-memento-data.interfate';
import { WorkflowMetadataInterface } from './workflow-metadata.interface';

export interface WorkflowStateInterface<TData extends z.ZodType, TInferred = z.infer<TData>> {
  get<K extends keyof TInferred>(key: K): TInferred[K];
  set<K extends keyof TInferred>(key: K, value: TInferred[K]): void;
  update(partial: Partial<TInferred>): void;
  getAll(): Readonly<TInferred>;

  getAllMetadata(): Readonly<WorkflowMetadataInterface>;
  getMetadata<K extends keyof WorkflowMetadataInterface>(key: K): WorkflowMetadataInterface[K];
  setMetadata<K extends keyof WorkflowMetadataInterface>(key: K, value: WorkflowMetadataInterface[K]): void;
  updateMetadata(partial: Partial<WorkflowMetadataInterface>): void;

  checkpoint(): void;
  serialize(): WorkflowMementoData<TInferred>[];
  getHistory(): WorkflowMementoData<TInferred>[];
  restoreToLatest(): boolean;
}
