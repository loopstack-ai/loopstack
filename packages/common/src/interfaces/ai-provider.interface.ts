export interface AiProviderOptions {
  apiKey: string;
  model: string;
  baseURL?: string;
}

export interface AiProviderInterface {
  createClient(options: AiProviderOptions): any;
  getModel(client: any, model: string): any;
}