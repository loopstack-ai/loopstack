import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import {
  ChatCompletionCreateParamsBase,
} from 'openai/src/resources/chat/completions/completions';

export interface MessageInterface {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const defaultOptions = {
  model: 'gpt-3.5-turbo',
};

@Injectable()
export class OpenaiClientService {

  private instance: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.instance = new OpenAI({
      baseURL: this.configService.get('llm.baseUrl'),
      apiKey: this.configService.get('llm.apiKey'),
    });
  }

  async sendMessages(
    messages: MessageInterface[],
    options: Partial<ChatCompletionCreateParamsBase>,
  ) {
    return this.instance.chat.completions.create(
      {
        ...defaultOptions,
        ...options,
        messages: messages,
        stream: false
      },
      {
        timeout: this.configService.get('llm').timout ?? 180000,
      },
    );
  }
}