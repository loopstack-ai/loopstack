import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { OpenAiModelConfig } from '../types';

@Injectable()
export class OpenAiClientService {
  private getApiKey(envApiKey?: string): string {
    const envVar = envApiKey ?? 'OPENAI_API_KEY';
    const apiKey = process.env[envVar];

    if (!apiKey) {
      throw new Error(`No API key found! Please make sure to provide "${envVar}" in your .env file.`);
    }

    return apiKey;
  }

  getClient(config?: OpenAiModelConfig): OpenAI {
    const apiKey = this.getApiKey(config?.envApiKey);
    return new OpenAI({ apiKey });
  }

  getModel(config?: OpenAiModelConfig, defaultModel?: string): string {
    const model = config?.model ?? process.env['OPENAI_MODEL'] ?? defaultModel;

    if (!model) {
      throw new Error(
        'No model defined. Please provide OPENAI_MODEL env var or set the model parameter in the tool args.',
      );
    }

    return model;
  }
}
