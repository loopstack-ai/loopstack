export interface TransitionPayloadInterface {
    workflowStateId: string;
    transition: string;
    payload?: any;
}
