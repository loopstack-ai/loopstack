import { TransitionPayloadInterface } from './transition-payload.interface';

export interface WorkflowStateContextInterface {
  options: Record<string, any>,
  pendingTransition: TransitionPayloadInterface | undefined;
  isStateValid: boolean;
  invalidationReasons: string[];
}
