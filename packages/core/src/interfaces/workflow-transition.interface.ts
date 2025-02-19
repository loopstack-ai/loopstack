export interface WorkflowTransitionInterface {
    from: string;
    to: string;
    trigger: "manual" | "auto";
}