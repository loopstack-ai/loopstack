export interface StateMachineValidatorInterface {
    validate(pendingWorkflowTransitions: any[], workflowState: any): { valid: boolean; reason: string | null; };
}
