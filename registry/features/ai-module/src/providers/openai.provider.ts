import { createOpenAI } from '@ai-sdk/openai';
import { AiProvider, AiProviderInterface, AiProviderOptions } from '@loopstack/common';

@AiProvider({
  name: 'openai',
})
export class OpenAiProviderService implements AiProviderInterface {
  createClient(options: AiProviderOptions) {
    return createOpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
  }

  getModel(client: any, model: string) {
    return client(model);
  }
}