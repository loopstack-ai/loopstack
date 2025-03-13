import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

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

    const apiKey = this.configService.get('llm.apiKey');
    if (!apiKey) {
      throw new Error('No openai api key provided. Please set LLM_API_KEY in your .env file.')
    }

    this.instance = new OpenAI({
      baseURL: this.configService.get('llm.baseUrl'),
      apiKey: this.configService.get('llm.apiKey'),
    });
  }

  async sendMessages(
    messages: MessageInterface[],
    options: any,
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