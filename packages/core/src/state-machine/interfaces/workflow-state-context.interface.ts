import { TransitionPayloadInterface } from '@loopstack/shared';

export interface WorkflowStateContextInterface {
  pendingTransition: TransitionPayloadInterface | undefined;
  isStateValid: boolean;
  invalidationReasons: string[];
}
