import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';
import { DocumentCreateDto } from '../../persistence/dtos';
import {
  CreateDocumentPropsConfigType,
  CreateDocumentPropsSchema,
} from '@loopstack/shared';
import { FunctionCallService } from '../../processor/services/function-call.service';
const crypto = require('crypto');

@Injectable()
@StateMachineAction()
export class CreateDocumentAction implements StateMachineActionInterface {
  constructor(
    private transitionManagerService: TransitionManagerService,
    private functionCallService: FunctionCallService,
  ) {}

  generateUUID() {
    return crypto.randomUUID();
  }

  async execute(
    payload: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(payload);

    console.log(payload.props);
    const props: CreateDocumentPropsConfigType =
      CreateDocumentPropsSchema.parse(payload.props);

    const contents = this.functionCallService.runEval(props.contents, {
      payload
    });

    manager.createDocument(
      new DocumentCreateDto({
        name: props.name ?? this.generateUUID(),
        type: props.type,
        contents: contents,
        meta: {
          ...(props.meta ?? {}),
        },
      }),
    );

    return manager.getResult();
  }
}
