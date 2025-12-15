import { z } from 'zod';
import { WorkflowMementoData } from '../../interfaces';

export class WorkflowStateCaretaker<TData> {
  private mementos: WorkflowMementoData<TData>[] = [];

  save(memento: WorkflowMementoData<TData>): void {
    this.mementos.push(memento);
  }

  getHistory(): WorkflowMementoData<TData>[] {
    return [...this.mementos];
  }

  getLatest(): WorkflowMementoData<TData> | undefined {
    if (!this.mementos.length) return undefined;
    return this.mementos[this.mementos.length - 1];
  }

  serialize(): WorkflowMementoData<TData>[] {
    return this.mementos; // nothing to serialize yet
  }

  static deserialize<TData>(data: WorkflowMementoData<TData>[], schema: z.ZodType<TData>): WorkflowStateCaretaker<TData> {
    const caretaker = new WorkflowStateCaretaker<TData>();

    for (const item of data) {
      const memento = {
        data: schema.parse(item.data),
        metadata: item.metadata,
        timestamp: new Date(item.timestamp),
        version: item.version,
      } satisfies WorkflowMementoData<TData>;

      caretaker.save(memento);
    }

    return caretaker;
  }
}