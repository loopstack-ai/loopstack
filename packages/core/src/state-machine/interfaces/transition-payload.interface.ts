export interface TransitionPayloadInterface {
  id: string;
  workflowStateId: string;
  transition: string;
  payload?: any;
  meta?: any;
}
