import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor';
import { TransitionResultInterface } from '../../processor';
import { DocumentType, DocumentSchema } from '@loopstack/shared';
import { z } from 'zod';
import { StateMachineAction } from '../../processor';
import { ActionHelperService } from '../../common/services/action-helper.service';
import { FunctionCallService } from '../../common/services/function-call.service';

@Injectable()
@StateMachineAction()
export class CreateDocumentAction implements StateMachineActionInterface {

  propsSchema = z.object({
    output: DocumentSchema
  });

  constructor(
    private transitionManagerService: ActionHelperService,
    private functionCallService: FunctionCallService,
  ) {}

  async execute(
    context: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(context);

    const document: DocumentType = DocumentSchema.parse(context.props.output);

    const contents = this.functionCallService.runEval(document.contents, {
      context
    });

    manager.addDocument({
      ...document,
      contents: contents,
    });

    return manager.getResult();
  }
}
