import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor';
import { TransitionResultInterface } from '../../processor';
import { DocumentType, DocumentSchema } from '@loopstack/shared';
import { z } from 'zod';
import { StateMachineAction } from '../../processor';
import { TransitionManagerService } from '../../persistence/services/transition-manager.service';
import { FunctionCallService } from '../../common/services/function-call.service';

@Injectable()
@StateMachineAction()
export class CreateDocumentAction implements StateMachineActionInterface {

  propsSchema = z.object({
    output: DocumentSchema
  });

  constructor(
    private transitionManagerService: TransitionManagerService,
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

    const schema = document.schema;
    const uiSchema = document.uiSchema;

    console.log(uiSchema);

    manager.createDocument({
      ...document,
      uiSchema: uiSchema as any,
      contents: contents,
    });

    return manager.getResult();
  }
}
