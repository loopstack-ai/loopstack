import { WorkflowTransitionType } from '@loopstack/shared';
import { WorkflowPlaceInfoInterface } from '@loopstack/shared/dist/interfaces/workflow-place-info.interface';

export class WorkflowStatePlaceInfoDto implements WorkflowPlaceInfoInterface {
  availableTransitions: WorkflowTransitionType[];

  constructor(items: WorkflowTransitionType[]) {
    this.availableTransitions = items;
  }
}
