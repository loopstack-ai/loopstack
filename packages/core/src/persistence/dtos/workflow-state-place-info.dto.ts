import { WorkflowTransitionType } from '../../configuration/schemas/workflow-transition.schema';

export class WorkflowStatePlaceInfoDto {
  availableTransitions: WorkflowTransitionType[];

  constructor(items: WorkflowTransitionType[]) {
    this.availableTransitions = items;
  }
}
