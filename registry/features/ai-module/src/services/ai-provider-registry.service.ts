import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { LanguageModel } from 'ai';
import {
  AI_PROVIDER_DECORATOR,
  AiProviderDecoratorOptions,
  AiProviderInterface,
  AiProviderOptions,
} from '@loopstack/common';

@Injectable()
export class AiProviderRegistryService implements OnModuleInit {
  private readonly logger = new Logger(AiProviderRegistryService.name);
  private readonly providers = new Map<string, AiProviderInterface>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    this.loadProviders();
  }

  private loadProviders() {
    const providers = this.discoveryService.getProviders();

    providers
      .filter((wrapper) => wrapper.isDependencyTreeStatic())
      .filter((wrapper) => wrapper.instance)
      .forEach((wrapper) => {
        const instance = wrapper.instance as AiProviderInterface;
        const metadata = this.reflector.get<AiProviderDecoratorOptions>(
          AI_PROVIDER_DECORATOR,
          (instance as object).constructor,
        );

        if (metadata) {
          this.registerProvider(metadata.name, instance);
          this.logger.log(`Registered AI provider: ${metadata.name}`);
        }
      });
  }

  private registerProvider(name: string, provider: AiProviderInterface) {
    if (this.providers.has(name)) {
      this.logger.warn(`Provider ${name} already exists, overriding...`);
    }
    this.providers.set(name.toLowerCase(), provider);
  }

  createModel(providerName: string, options: AiProviderOptions): LanguageModel {
    const provider = this.providers.get(providerName.toLowerCase());

    if (!provider) {
      throw new Error(
        `AI provider '${providerName}' not found. Available providers: ${this.getAvailableProviders().join(', ')}`,
      );
    }

    try {
      const client: unknown = provider.createClient(options);
      return provider.getModel(client, options.model) as LanguageModel;
    } catch (error) {
      this.logger.error(`Failed to create model for provider ${providerName}:`, error);
      throw error;
    }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
