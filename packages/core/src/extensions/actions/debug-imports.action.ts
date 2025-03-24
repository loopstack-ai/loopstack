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

    if (payload.data?.imports) {
      for (const [name, item] of Object.entries(payload.data.imports)) {
        manager.addDocument({
          name: `debug-${name}`,
          type: 'info',
          contents: JSON.stringify(item, null, 2),
          contentType: 'json',
          meta: {
            hideAtPlaces: ['finished']
          }
        });
      }
    }

    return manager.getResult();
  }
}
