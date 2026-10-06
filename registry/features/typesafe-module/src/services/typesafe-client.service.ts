import { Injectable } from '@nestjs/common';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import type { Questions, SystemOneRequest, SystemOneResult } from '@typesafe-ai/sdk';
import type { TypeSafeModelConfig } from '../types/index.js';

/**
 * Creates TypeSafe SDK clients with the API key read from the environment.
 *
 * Inject it to call `systemOne()` directly when you want answer types inferred from your own question literals.
 *
 * @providedBy TypeSafeModule
 * @public
 */
@Injectable()
export class TypeSafeClientService {
  private getApiKey(envApiKey?: string): string {
    const envVar = envApiKey ?? 'TYPESAFE_API_KEY';
    const apiKey = process.env[envVar];

    if (!apiKey) {
      throw new Error(`No API key found! Please make sure to provide "${envVar}" in your .env file.`);
    }

    return apiKey;
  }

  getClient(config?: TypeSafeModelConfig): TypeSafeClient {
    const apiKey = this.getApiKey(config?.envApiKey);
    return new TypeSafeClient({ apiKey, ...(config?.model && { defaultModel: config.model }) });
  }

  /**
   * Answer named questions about `state`. Answer types follow the question literals, so
   * `choice('…', { billing: null, other: null })` yields `answers.x.choice: 'billing' | 'other'`.
   */
  async systemOne<const Q extends Questions>(
    request: SystemOneRequest<Q>,
    options?: { envApiKey?: string; signal?: AbortSignal },
  ): Promise<SystemOneResult<Q>> {
    const client = this.getClient({ envApiKey: options?.envApiKey });
    return client.systemOne(request, { signal: options?.signal });
  }
}
