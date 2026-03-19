import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ClaudeModelConfig } from '../types';

@Injectable()
export class ClaudeClientService {
  private getApiKey(envApiKey?: string): string {
    const envVar = envApiKey ?? 'ANTHROPIC_API_KEY';
    const apiKey = process.env[envVar];

    if (!apiKey) {
      throw new Error(`No API key found! Please make sure to provide "${envVar}" in your .env file.`);
    }

    return apiKey;
  }

  getClient(config?: ClaudeModelConfig): Anthropic {
    const apiKey = this.getApiKey(config?.envApiKey);
    return new Anthropic({ apiKey });
  }

  getModel(config?: ClaudeModelConfig): string {
    const model = config?.model ?? process.env['CLAUDE_MODEL'];

    if (!model) {
      throw new Error(
        'No model defined. Please provide CLAUDE_MODEL env var or set the claude.model parameter in the tool args.',
      );
    }

    return model;
  }
}
