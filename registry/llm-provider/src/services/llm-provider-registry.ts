import { Injectable } from '@nestjs/common';
import type { LlmProviderInterface } from '../contracts/index.js';

@Injectable()
export class LlmProviderRegistry {
  private readonly providers = new Map<string, LlmProviderInterface>();

  register(provider: LlmProviderInterface): void {
    this.providers.set(provider.providerId, provider);
  }

  get(providerId: string): LlmProviderInterface {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(
        `LLM provider "${providerId}" is not registered. ` +
          `Available providers: ${[...this.providers.keys()].join(', ') || 'none'}. ` +
          `Make sure to import the provider module (e.g. ClaudeModule) in your NestJS module.`,
      );
    }
    return provider;
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  getProviderIds(): string[] {
    return [...this.providers.keys()];
  }
}
