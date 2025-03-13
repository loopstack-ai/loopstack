import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../../processor/decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor/interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../../processor/interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';
import { PromptHelperService } from '../services/prompt-helper.service';
import { PromptActionPropsSchema } from '../schemas/prompt-action-props.schema';
import { DocumentSchema, DocumentType } from '@loopstack/shared';
import { FunctionCallService } from '../../processor/services/function-call.service';

@Injectable()
@StateMachineAction()
export class PromptAction implements StateMachineActionInterface {

  propsSchema = PromptActionPropsSchema;

  constructor(
    private transitionManagerService: TransitionManagerService,
    private promptHelperService: PromptHelperService,
    private functionCallService: FunctionCallService,
  ) {}

  async execute(
    context: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(context);
    const document: DocumentType = DocumentSchema.parse(context.props.output);

    // merge inputs in single object
    let inputs = this.promptHelperService.mergeInputs(
      context.props.inputs,
      context.workflowContext
    );

    // create prompt messages
    const messages = this.promptHelperService.createMessages(context.props, { inputs });

    // todo implement caching

    // execute the prompt
    const options = this.promptHelperService.getLlmOptions(context.props);
    const response = await this.promptHelperService.sendPrompt(messages, options);

    // create document
    const contents = this.functionCallService.runEval(document.contents, {
      context,
      response,
      output: response,
    });

    const uiSchema = document.uiSchema;

    // create the output document
    manager.createDocument({
      ...document,
      uiSchema: uiSchema as any,
      contents: contents,
    });

    return manager.getResult();
  }
}
