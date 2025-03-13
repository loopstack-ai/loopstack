import { Injectable } from '@nestjs/common';
import { TemplateEngineService } from '../../processor/services/template-engine.service';
import { MessageInterface, OpenaiClientService } from '../clients/openai-client.service';
import { ConfigService } from '@nestjs/config';
import { ContextInterface } from '../../processor/interfaces/context.interface';

@Injectable()
export class PromptHelperService {
  constructor(
    private configService: ConfigService,
    private templateEngineService: TemplateEngineService,
    private openaiClientService: OpenaiClientService,
  ) {}

  createMessages(props: any, templateVariables: any): MessageInterface[] {
    const messages: MessageInterface[] = [];
    if (props.system) {
      const content = this.templateEngineService.parseValue(props.system, templateVariables);

      messages.push({
        role: 'system',
        content,
      })
    }

    if (props.context) {
      const content = this.templateEngineService.parseValue(props.context, templateVariables);

      messages.push({
        role: 'user',
        content,
      })
    }

    const taskMessage: string = this.templateEngineService.parseValue(props.task, templateVariables);

    messages.push({
      role: 'user',
      content: taskMessage,
    });

    return messages;
  }

  getLlmOptions(props: any): any {
    const defaultModel = this.configService.get('llm.defaultModel');
    const defaultTemperature = this.configService.get('llm.defaultTemperature');
    return {
      model: props.llm?.model ?? defaultModel,
      temperature: props.llm?.temperature ?? defaultTemperature,
    };
  }

  async sendPrompt(messages: MessageInterface[], options: any): Promise<string> {

    // todo implement caching

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
}
