import { createAnthropic } from '@ai-sdk/anthropic';
import {
  AiProvider,
  AiProviderInterface,
  AiProviderOptions,
} from '@loopstack/common';

@AiProvider({
  name: 'anthropic',
})
export class AnthropicProviderService implements AiProviderInterface {
  createClient(options: AiProviderOptions) {
    return createAnthropic({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
  }

  getModel(client: any, model: string) {
    return client(model);
  }
}
