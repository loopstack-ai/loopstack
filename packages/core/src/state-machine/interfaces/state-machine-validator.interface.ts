import { TransitionPayloadInterface } from '@loopstack/shared';
import { WorkflowEntity } from '../../persistence/entities';

export interface StateMachineValidatorInterface {
  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
    options: Record<string, any> | undefined,
  ): { valid: boolean; reason: string | null };
}
