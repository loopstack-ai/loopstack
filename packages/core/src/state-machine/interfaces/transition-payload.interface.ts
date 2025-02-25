export interface TransitionPayloadInterface {
  workflowId: string;
  transition: string;
  payload?: any;
  meta?: any;
}
