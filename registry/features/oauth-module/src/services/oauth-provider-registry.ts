import { Injectable } from '@nestjs/common';
import type { OAuthProviderInterface } from '../contracts';

@Injectable()
export class OAuthProviderRegistry {
  private readonly providers = new Map<string, OAuthProviderInterface>();

  register(provider: OAuthProviderInterface): void {
    this.providers.set(provider.providerId, provider);
  }

  get(providerId: string): OAuthProviderInterface {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`OAuth provider "${providerId}" is not registered.`);
    }
    return provider;
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }
}
