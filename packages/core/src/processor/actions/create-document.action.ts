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
import { FunctionCallService } from '../services/function-call.service';
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
    context: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(context);

    const props: CreateDocumentPropsConfigType =
      CreateDocumentPropsSchema.parse(context.props);

    const contents = this.functionCallService.runEval(props.contents, {
      context
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
