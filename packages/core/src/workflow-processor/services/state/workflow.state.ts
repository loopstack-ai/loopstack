import { z } from 'zod';
import { WorkflowStateCaretaker } from './workflow-state-caretaker';
import { WorkflowMementoData } from '../../interfaces/workflow-memento-data.interfate';
import { WorkflowMetadataInterface } from '../../interfaces/workflow-metadata.interface';
import { merge } from 'lodash';

export class WorkflowState<TData extends z.ZodType> {
  private data: z.infer<TData>;
  private metadata: WorkflowMetadataInterface;
  private version: number;

  public readonly caretaker: WorkflowStateCaretaker<z.infer<TData>>;

  constructor(
    private readonly schema: TData,
    caretaker: WorkflowStateCaretaker<z.infer<TData>>,
    data: z.infer<TData>,
    metadata: WorkflowMetadataInterface,
  ) {
    this.data = data;
    this.metadata = metadata;
    this.version = 1;

    this.caretaker = caretaker;
    this.restoreToLatest();
  }

  get<K extends keyof z.infer<TData>>(key: K): z.infer<TData>[K] {
    return this.data[key];
  }

  set<K extends keyof z.infer<TData>>(key: K, value: z.infer<TData>[K]): void {
    this.data[key] = value;
    this.data = this.schema.parse(this.data);
  }

  update(partial: Partial<z.infer<TData>>): void {
    this.data = this.schema.parse({ ...this.data, ...partial });
  }

  getAll(): Readonly<z.infer<TData>> {
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
    const memento = {
      data: { ...this.data },
      metadata: { ...this.metadata },
      timestamp: new Date(),
      version: this.version++,
    } satisfies WorkflowMementoData<TData>;
    this.caretaker.save(memento);
  }

  restoreToLatest(): boolean {
    const memento = this.caretaker.getLatest();
    if (!memento) return false;

    this.data = this.schema.parse(memento.data);
    this.metadata = memento.metadata;
    this.version = memento.version + 1;
    return true;
  }
}