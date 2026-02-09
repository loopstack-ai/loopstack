import { z } from 'zod';
import { WorkflowMementoData } from '@loopstack/common';

export class StateCaretaker<TState, TData> {
  private mementos: WorkflowMementoData<TState, TData>[] = [];

  save(memento: WorkflowMementoData<TState, TData>): void {
    this.mementos.push(memento);
  }

  getHistory(): WorkflowMementoData<TState, TData>[] {
    return [...this.mementos];
  }

  getLatest(): WorkflowMementoData<TState, TData> | undefined {
    if (!this.mementos.length) return undefined;
    return this.mementos[this.mementos.length - 1];
  }

  serialize(): WorkflowMementoData<TState, TData>[] {
    return this.mementos; // nothing to serialize yet
  }

  static deserialize<TState, TData>(
    data: WorkflowMementoData<TState, TData>[] | null,
    schema: z.ZodType<TState> | undefined,
  ): StateCaretaker<TState, TData> {
    const caretaker = new StateCaretaker<TState, TData>();

    if (null !== data) {
      for (const item of data) {
        const memento = {
          state: schema ? schema.parse(item.state) : item.state,
          data: item.data,
          timestamp: new Date(item.timestamp),
          version: item.version,
        } satisfies WorkflowMementoData<TState, TData>;

        caretaker.save(memento);
      }
    }

    return caretaker;
  }
}
