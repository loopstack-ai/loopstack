import { Injectable } from '@nestjs/common';
import { StateMachineAction } from '../../processor/decorators/state-machine-observer.decorator';
import {
  ActionExecutePayload,
  StateMachineActionInterface,
} from '../../processor/interfaces/state-machine-action.interface';
import { TransitionResultInterface } from '../../processor/interfaces/transition-result.interface';
import { TransitionManagerService } from '../services/transition-manager.service';
import { z } from 'zod';
import { DocumentSchema } from '../../configuration/schemas/document.schema';
import { TemplateEngineService } from '../../processor/services/template-engine.service';
import { SchemaToTemplateBuilderService } from '../services/schema-to-template-builder.service';
import { MessageInterface, OpenaiClientService } from '../clients/openai-client.service';
import { MarkdownParserService } from '../services/markdown-parser.service';
import { ConfigService } from '@nestjs/config';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { ChatCompletionCreateParamsBase } from 'openai/src/resources/chat/completions/completions';

export const PromptActionPropsSchema = z.object({
  inputs: z.any(z.string()).optional(),
  output: DocumentSchema.optional(),
  system: z.string().optional(),
  task: z.string(),
  context: z.string().optional(),
})

@Injectable()
@StateMachineAction()
export class PromptAction implements StateMachineActionInterface {

  propsSchema = PromptActionPropsSchema;

  constructor(
    private configService: ConfigService,
    private transitionManagerService: TransitionManagerService,
    private templateEngineService: TemplateEngineService,
    private schemaToTemplateBuilderService: SchemaToTemplateBuilderService,
    private openaiClientService: OpenaiClientService,
    private markdownParserService: MarkdownParserService,
  ) {}

  getRootName(props: any): string {
    return props.output.schema.title ?? 'Document';
  }

  createMessages(props: any, inputs: Record<string, any>): MessageInterface[] {
    const documentRootName = this.getRootName(props);

    const messages: MessageInterface[] = [];
    if (props.system) {
      const content = this.templateEngineService.parseValue(props.system, {
        inputs,
        documentRootName
      });

      messages.push({
        role: 'system',
        content,
      })
    }

    if (props.context) {
      const content = this.templateEngineService.parseValue(props.context, {
        inputs,
        documentRootName
      });

      messages.push({
        role: 'user',
        content,
      })
    }

    const defaultTemplateHints = `Use the Template below for your answer. Make sure to use valid markdown syntax including # for headings, dashes for lists, triple quotes for code blocks etc. Do not add triple quotes around the markdown itself.`;
    const defaultClosing = "Let's work this out in a step by step way to be sure we have the right answer. Think about the answer first before you start writing.";
    const outputTemplate = props.output ? this.schemaToTemplateBuilderService.createTemplateFromSchema(
      documentRootName,
      props.output.schema,
    ) : '';

    const taskMessage: string = this.templateEngineService.parseValue(props.task, {
      documentRootName,
      snippets: {
        defaultTemplateHints,
        defaultClosing,
      },
      inputs,
      outputTemplate,
    });

    messages.push({
      role: 'user',
      content: taskMessage,
    });

    return messages;
  }

  getLlmOptions(props: any): Partial<ChatCompletionCreateParamsBase> {
    const defaultModel = this.configService.get('llm.defaultModel') ?? 'gpt-3.5-turbo';
    const defaultTemperature = this.configService.get('llm.defaultTemperature') ?? 0;
    return {
      model: props.llm?.model ?? defaultModel,
      temperature: props.llm?.temperature ?? defaultTemperature,
    };
  }

  async sendPrompt(messages: MessageInterface[], options: Partial<ChatCompletionCreateParamsBase>): Promise<string> {
    const response = await this.openaiClientService.sendMessages(
      messages,
      options,
    );
    const data = response.choices[0].message.content;
    if (!data) {
      throw new Error('no content in prompt response');
    }

    return data;
  }

  parseOutput(props: any, response: string) {
    const documentRootName = this.getRootName(props);

    return this.markdownParserService.parse(
      response,
      documentRootName,
      props.output.schema,
    );
  }

  mergeInputs(names: string[] | undefined, context: ContextInterface): Record<string, any> {
    if (!names?.length) {
      return {};
    }

    return context.imports
      ?.filter((item) => names.includes(item.name))
      .map((item) => ({
        [item.name]: item.curr,
      })).reduce((prev, curr) => ({
        ...prev,
        ...curr,
      }), {}) ?? {};
  }

  async execute(
    payload: ActionExecutePayload,
  ): Promise<TransitionResultInterface> {
    const manager = this.transitionManagerService.setContext(payload);

    // merge inputs in single object
    let inputs = this.mergeInputs(
      payload.props.inputs,
      payload.workflowContext
    );

    // create prompt messages
    const messages = this.createMessages(payload.props, inputs);

    // todo implement caching

    // execute the prompt
    const options = this.getLlmOptions(payload.props);
    const response = await this.sendPrompt(messages, options);

    // parse output
    const output = this.parseOutput(payload.props, response);

    // create the output document
    manager.createDocument({
      name: payload.props.output.name,
      type: 'document',
      contents: output,
      schema: payload.props.output.schema,
      meta: {}
    });

    return manager.getResult();
  }
}
