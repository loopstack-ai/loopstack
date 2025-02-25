import { TransitionPayloadInterface } from './transition-payload.interface';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

export interface StateMachineValidatorInterface {
  validate(
    pendingTransition: TransitionPayloadInterface | undefined,
    workflow: WorkflowEntity,
    options: Record<string, any>,
  ): { valid: boolean; reason: string | null };
}
