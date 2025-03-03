import { HistoryTransition } from '../interfaces';

export class WorkflowStateHistoryDto {
  history: HistoryTransition[];

  constructor(items: HistoryTransition[]) {
    this.history = items;
  }
}
