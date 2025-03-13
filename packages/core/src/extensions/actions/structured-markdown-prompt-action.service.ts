import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../../processor/decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor/interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../../processor/interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';
import { PromptActionPropsSchema } from '../schemas/prompt-action-props.schema';
import { PromptHelperService } from '../services/prompt-helper.service';
import { MarkdownParser } from '@loopstack/markdown-parser';
import { SchemaToTemplateBuilder } from '@loopstack/schema-to-template';
import { DocumentSchema, DocumentType } from '@loopstack/shared';
import { FunctionCallService } from '../../processor/services/function-call.service';
import { SnippetCollectionService } from '../../configuration/services/snippet-collection.service';

@Injectable()
@StateMachineAction()
export class StructuredMarkdownPromptAction implements StateMachineActionInterface {

  propsSchema = PromptActionPropsSchema;

  constructor(
    private transitionManagerService: TransitionManagerService,
    private promptHelperService: PromptHelperService,
    private functionCallService: FunctionCallService,
    private snippetCollectionService: SnippetCollectionService,
  ) {}

  parseOutput(schema: any, response: string) {
    const parser = new MarkdownParser();
    return parser.parse(
      response,
      schema,
    );
  }

  createTemplate(schema: any) {
    const builder = new SchemaToTemplateBuilder();
    return builder.createTemplateFromSchema(schema);
  }

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
    const defaultTemplateHints = this.snippetCollectionService.getByName('defaultMdTemplateHints');
    const defaultClosing = this.snippetCollectionService.getByName('defaultClosing');

    const outputTemplate = document.schema ? this.createTemplate(document.schema) : '';
    const messages = this.promptHelperService.createMessages(context.props, {
      snippets: {
        defaultTemplateHints,
        defaultClosing,
      },
      inputs,
      outputTemplate,
    });

    // execute the prompt
    const options = this.promptHelperService.getLlmOptions(context.props);
    const response = await this.promptHelperService.sendPrompt(messages, options);

    // parse output
    const output = document.schema ? this.parseOutput(document.schema, response) : response;

    // create document
    const contents = this.functionCallService.runEval(document.contents, {
      context,
      response,
      output,
    });

    const schema = document.schema;
    const uiSchema = document.uiSchema;

    console.log(uiSchema);

    // create the output document
    manager.createDocument({
      ...document,
      schema,
      uiSchema: uiSchema as any,
      contents: contents,
    });

    return manager.getResult();
  }
}
