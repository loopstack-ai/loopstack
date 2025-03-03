import { WorkflowTransitionConfigInterface } from '@loopstack/shared';

export class WorkflowStatePlaceInfoDto {
  availableTransitions: WorkflowTransitionConfigInterface[];

  constructor(items: WorkflowTransitionConfigInterface[]) {
    this.availableTransitions = items;
  }
}
