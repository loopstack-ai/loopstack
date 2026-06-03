import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { FEATURE_REGISTRATION_KEY, type FeatureRegistration } from '@loopstack/common';

@Injectable()
export class FeatureRegistryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FeatureRegistryService.name);
  private features: FeatureRegistration[] = [];

  constructor(private readonly discoveryService: DiscoveryService) {}

  onApplicationBootstrap(): void {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      if (!wrapper.metatype) continue;

      const meta = Reflect.getMetadata(FEATURE_REGISTRATION_KEY, wrapper.metatype) as FeatureRegistration | undefined;

      if (!meta) continue;

      // Deduplicate by feature id (first registration wins)
      if (!this.features.some((f) => f.id === meta.id)) {
        this.features.push(meta);
      }
    }

    if (this.features.length > 0) {
      this.logger.log(`Discovered ${this.features.length} feature(s): ${this.features.map((f) => f.id).join(', ')}`);
    }
  }

  getFeatures(): FeatureRegistration[] {
    return this.features;
  }
}
