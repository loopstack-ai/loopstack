import { WorkflowEntity } from '../entities';

export interface StateMachineValidatorInterface {
  validate(
    workflow: WorkflowEntity,
    args: Record<string, any> | undefined,
  ): { valid: boolean; target?: string; hash?: string; }
}
