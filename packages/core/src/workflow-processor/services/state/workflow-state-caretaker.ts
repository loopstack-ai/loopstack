import { z } from 'zod';
import { WorkflowMementoData } from '../../interfaces/workflow-memento-data.interfate';

export class WorkflowStateCaretaker<TData> {
  private mementos: WorkflowMementoData<TData>[] = [];
  private stepIndex: Map<string, number[]> = new Map();

  save(step: string, memento: WorkflowMementoData<TData>): void {
    const index = this.mementos.length;
    this.mementos.push(memento);

    const indices = this.stepIndex.get(step) ?? [];
    indices.push(index);
    this.stepIndex.set(step, indices);
  }

  getAtStep(step: string): WorkflowMementoData<TData> | undefined {
    const indices = this.stepIndex.get(step);
    if (!indices?.length) return undefined;
    return this.mementos[indices[indices.length - 1]];
  }

  getHistory(): WorkflowMementoData<TData>[] {
    return [...this.mementos];
  }

  getSteps(): string[] {
    const seen = new Set<string>();
    return this.mementos
      .map(m => m.step)
      .filter(step => {
        if (seen.has(step)) return false;
        seen.add(step);
        return true;
      });
  }

  getLatest(): WorkflowMementoData<TData> | undefined {
    if (!this.mementos.length) return undefined;
    return this.mementos[this.mementos.length - 1];
  }

  serialize(): WorkflowMementoData<TData>[] {
    return this.mementos; // nothing to serialize yet
  }

  static deserialize<TData>(data: any[], schema: z.ZodType<TData>): WorkflowStateCaretaker<TData> {
    const caretaker = new WorkflowStateCaretaker<TData>();

    for (const item of data) {
      const memento = {
        data: schema.parse(item.data),
        metadata: item.metadata,
        step: item.step,
        timestamp: new Date(item.timestamp),
        version: item.version,
      } satisfies WorkflowMementoData<TData>;

      caretaker.save(item.step, memento);
    }

    return caretaker;
  }
}