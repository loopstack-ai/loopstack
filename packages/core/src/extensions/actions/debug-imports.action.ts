import { Injectable } from '@nestjs/common';
import {
  ActionExecutePayload,
  StateMachineActionInterface, TransitionResultInterface,
} from '../../processor';
import { z } from 'zod';
import { StateMachineAction } from '../../processor';
import { TransitionManagerService } from '../../persistence/services/transition-manager.service';

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
          contents: item,
        });
      }
    }

    return manager.getResult();
  }
}
