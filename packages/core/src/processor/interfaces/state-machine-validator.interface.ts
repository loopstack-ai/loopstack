export interface StateMachineValidatorInterface {
    validate(pendingWorkflowTransitions: any[], workflowState: any): boolean;
}
