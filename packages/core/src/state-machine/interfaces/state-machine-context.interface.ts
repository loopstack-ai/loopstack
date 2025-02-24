import { TransitionPayloadInterface } from './transition-payload.interface';

export interface StateMachineContextInterface {
  pendingTransitions: TransitionPayloadInterface[],
  isStateValid: boolean;
  invalidationReasons: string[];
}
