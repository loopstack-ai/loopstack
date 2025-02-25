import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../decorators/state-machine-observer.decorator';
import { StateMachineActionInterface } from '../interfaces/state-machine-action.interface';
import { ContextInterface } from 'src/processor/interfaces/context.interface';
import { StateMachineContextInterface } from '../interfaces/state-machine-context.interface';
import { TransitionContextInterface } from '../interfaces/transition-context.interface';
import { TransitionResultInterface } from '../interfaces/transition-result.interface';
import { WorkflowEntity } from '../../persistence/entities/workflow.entity';

@Injectable()
@StateMachineAction()
export class InitAction implements StateMachineActionInterface {
  async execute(
    workflowContext: ContextInterface,
    stateMachineContext: StateMachineContextInterface,
    transitionContext: TransitionContextInterface,
    workflow: WorkflowEntity,
    props: any,
  ): Promise<TransitionResultInterface> {
    // let previousOptions: WorkflowDocumentEntity<any>[] = [];
    // if (event.runContext.isReRun) {
    //     previousOptions = event.getExportedType<any>('input-option');
    //
    //     if (previousOptions?.length) {
    //         event.addMessage(
    //             `Re-Running workflow due to: ${event.runContext.invalidationReasons?.join(', ')}`,
    //         );
    //     }
    // }
    // const hasPreviousOptions = !!previousOptions?.length;

    return {};
  }
}
