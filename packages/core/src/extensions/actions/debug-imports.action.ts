import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../../processor/decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor/interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../../processor/interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';
import { z } from 'zod';

@Injectable()
@StateMachineAction()
export class DebugImportsAction implements StateMachineActionInterface {

  propsSchema = z.object({}).optional();

  constructor(private transitionManagerService: TransitionManagerService) {}

  async execute(
    payload: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(payload);

    if (payload.workflowContext.imports) {
      for (const item of payload.workflowContext.imports) {
        manager.createDocument({
          name: `debug-${item.name}`,
          type: 'document',
          contents: item.curr,
        });
      }
    }

    return manager.getResult();
  }
}
