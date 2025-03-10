import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../../processor/decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor/interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../../processor/interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';
import { FunctionCallService } from '../../processor/services/function-call.service';
import { DocumentType, DocumentSchema } from '@loopstack/shared';
const crypto = require('crypto');

@Injectable()
@StateMachineAction()
export class CreateDocumentAction implements StateMachineActionInterface {

  propsSchema = DocumentSchema;

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

    const props: DocumentType = DocumentSchema.parse(context.props);

    console.log('create document', context.props, props)

    const contents = this.functionCallService.runEval(props.contents, {
      context
    });

    // console.log(contents)
    manager.createDocument({
      name: props.name ?? this.generateUUID(),
      type: props.type,
      contents: contents,
      meta: {
        ...(props.meta ?? {}),
      },
    });

    return manager.getResult();
  }
}
