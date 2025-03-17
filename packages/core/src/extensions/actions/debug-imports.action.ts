import { Injectable } from '@nestjs/common';
import {
  ActionExecutePayload,
  StateMachineActionInterface, TransitionResultInterface,
} from '../../processor';
import { z } from 'zod';
import { StateMachineAction } from '../../processor';
import { ActionHelperService } from '../../common';

@Injectable()
@StateMachineAction()
export class DebugImportsAction implements StateMachineActionInterface {

  schema = z.object({}).optional();

  constructor(private transitionManagerService: ActionHelperService) {}

  async execute(
    payload: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(payload);

    if (payload.workflowContext.imports) {
      for (const item of payload.workflowContext.imports) {
        manager.addDocument({
          name: `debug-${item.name}`,
          type: 'document',
          contents: item,
        });
      }
    }

    return manager.getResult();
  }
}
