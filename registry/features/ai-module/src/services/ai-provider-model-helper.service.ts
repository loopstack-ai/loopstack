import { Injectable } from '@nestjs/common';
import { AiProviderRegistryService } from './ai-provider-registry.service';

export interface AiProviderModelConfig {
  model?: string;
  provider?: string;
  envApiKey?: string;
  cacheResponse?: boolean;
}

@Injectable()
export class AiProviderModelHelperService {

  constructor(
    private readonly aiProviderRegistry: AiProviderRegistryService,
  ) {}

  private getApiKey(envApiKey: string | undefined, providerName: string): string {
    const defaultKey = `${providerName.toUpperCase()}_API_KEY`;
    const apiKey = envApiKey ? process.env[envApiKey] : process.env[defaultKey];

    if (!apiKey) {
      throw new Error(
        `No API key found! Please make sure to provide "${envApiKey ?? defaultKey}" in your .env file.`,
      );
    }

    return apiKey;
  }

  private getModel(modelName: string | undefined): string {
    const model = modelName ?? process.env['DEFAULT_MODEL'];

    if (!modelName) {
      throw new Error(`No Model defined. Please provide DEFAULT_MODEL or set the model parameter in the completion service call.`);
    }

    return model;
  }

  private getProvider(name: string | undefined): string {
    const provider = name ?? process.env['DEFAULT_PROVIDER'];

    if (!provider) {
      throw new Error(`No Provider defined. Please provide DEFAULT_PROVIDER or set the provider parameter in the completion service call.`);
    }

    return provider;
  }

  getProviderModel(config: AiProviderModelConfig): any {
    const modelName = this.getModel(config.model);
    const providerName = this.getProvider(config.provider);
    const apiKey = this.getApiKey(config.envApiKey, providerName);

    return this.aiProviderRegistry.createModel(providerName, {
      apiKey: apiKey,
      model: modelName,
    });
  }
}