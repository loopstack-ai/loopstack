import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../interfaces/transition-result.interface';
import { generateObjectFingerprint } from '@loopstack/shared';
import { TransitionManagerService } from '../services/transition-manager.service';

@Injectable()
@StateMachineAction()
export class InitAction implements StateMachineActionInterface {
  constructor(private transitionManagerService: TransitionManagerService) {}

  async execute(
    payload: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(payload);

    manager.setWorkflowData({
      optionsHash: generateObjectFingerprint(manager.getOptions()),
      progress: 0,
    });

    const optionList = Object.entries(manager.getOptions())
      .map(([name, value]) => ({ name, value }))
      .filter((option) => option.value !== undefined);

    for (const item of optionList) {
      manager.createDocument({
        name: item.name,
        contents: item.value,
        type: 'option',
      });
    }

    return manager.getResult();
  }
}
