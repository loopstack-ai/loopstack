import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';

@Injectable()
@StateMachineAction()
export class PromptAction implements StateMachineActionInterface {
  constructor(private transitionManagerService: TransitionManagerService) {}

  async execute(
    payload: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(payload);

    console.log('PromptAction', payload.workflowContext.customOptions);

    return manager.getResult();
  }
}
