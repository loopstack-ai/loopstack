import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../decorators/state-machine-observer.decorator';
import { StateMachineActionInterface } from '../interfaces/state-machine-action.interface';
import { ContextInterface } from 'src/processor/interfaces/context.interface';
import { WorkflowStateContextInterface } from '../interfaces/workflow-state-context.interface';
import { TransitionContextInterface } from '../interfaces/transition-context.interface';
import { TransitionResultInterface } from '../interfaces/transition-result.interface';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

@Injectable()
@StateMachineAction()
export class PromptAction implements StateMachineActionInterface {
  async execute(
    workflowContext: ContextInterface,
    stateMachineContext: WorkflowStateContextInterface,
    transitionContext: TransitionContextInterface,
    workflow: WorkflowEntity,
    props: any,
  ): Promise<TransitionResultInterface> {
    console.log('PromptAction');
    return {};
  }
}
