import { TransitionPayloadInterface } from './transition-payload.interface';

export interface WorkflowStateContextInterface {
  pendingTransition: TransitionPayloadInterface | undefined;
  isStateValid: boolean;
  invalidationReasons: string[];
}
