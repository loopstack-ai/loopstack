import { merge } from 'lodash';
import { z } from 'zod';
import type { WorkflowMementoData, WorkflowMetadataInterface, WorkflowStateInterface } from '@loopstack/common';
import { WorkflowStateCaretaker } from './workflow-state-caretaker';

export class WorkflowState<TData extends z.ZodType, TInferred = z.infer<TData>> implements WorkflowStateInterface<
  TData,
  TInferred
> {
  private data: TInferred;
  private metadata: WorkflowMetadataInterface;
  private version: number;
  private caretaker: WorkflowStateCaretaker<TInferred>;

  constructor(
    private readonly schema: TData,
    caretaker: WorkflowStateCaretaker<TInferred>,
    data: TInferred,
    metadata: WorkflowMetadataInterface,
  ) {
    this.data = data;
    this.metadata = metadata;
    this.version = 1;

    this.caretaker = caretaker;
    this.restoreToLatest();
  }

  get<K extends keyof TInferred>(key: K): TInferred[K] {
    return this.data[key];
  }

  set<K extends keyof TInferred>(key: K, value: TInferred[K]): void {
    this.data[key] = value;
    this.data = this.schema.parse(this.data) as TInferred;
  }

  update(partial: Partial<TInferred>): void {
    this.data = this.schema.parse({ ...this.data, ...partial }) as TInferred;
  }

  getAll(): Readonly<TInferred> {
    return Object.freeze({ ...this.data });
  }

  getAllMetadata(): Readonly<WorkflowMetadataInterface> {
    return Object.freeze({ ...this.metadata });
  }

  getMetadata<K extends keyof WorkflowMetadataInterface>(key: K): WorkflowMetadataInterface[K] {
    return this.metadata[key];
  }

  setMetadata<K extends keyof WorkflowMetadataInterface>(key: K, value: WorkflowMetadataInterface[K]): void {
    this.metadata[key] = value;
  }

  updateMetadata(partial: Partial<WorkflowMetadataInterface>): void {
    this.metadata = merge(this.metadata, partial);
  }

  // Checkpoint at a named step
  checkpoint(): void {
    const memento: WorkflowMementoData<TInferred> = {
      data: { ...this.data },
      metadata: { ...this.metadata },
      timestamp: new Date(),
      version: this.version++,
    };
    this.caretaker.save(memento);
  }

  serialize(): WorkflowMementoData<TInferred>[] {
    return this.caretaker.serialize();
  }

  getHistory(): WorkflowMementoData<TInferred>[] {
    return this.caretaker.getHistory();
  }

  restoreToLatest(): boolean {
    const memento = this.caretaker.getLatest();
    if (!memento) return false;

    this.data = this.schema.parse(memento.data) as TInferred;
    this.metadata = memento.metadata;
    this.version = memento.version + 1;
    return true;
  }
}
