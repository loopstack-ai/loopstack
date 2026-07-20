import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { STUDIO_APP_EXTENSION_KEY } from '@loopstack/common';
import type { StudioAppExtension } from '@loopstack/common';
import type { AvailableEnvironmentInterface, EnvironmentConfigInterface } from '@loopstack/contracts/api';

@Injectable()
export class EnvironmentConfigService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EnvironmentConfigService.name);
  readonly available: AvailableEnvironmentInterface[];
  private _slots: EnvironmentConfigInterface[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    available?: AvailableEnvironmentInterface[],
  ) {
    this.available = available ?? [];
  }

  onApplicationBootstrap(): void {
    const providers = this.discoveryService.getProviders();
    for (const wrapper of providers) {
      if (!wrapper.metatype) continue;
      const meta = Reflect.getMetadata(STUDIO_APP_EXTENSION_KEY, wrapper.metatype) as StudioAppExtension | undefined;
      if (!meta || meta.section !== 'environments') continue;

      const slot = meta.data as EnvironmentConfigInterface;
      if (!this._slots.some((s) => s.id === slot.id)) {
        this._slots.push(slot);
      }
    }

    const availableTypes = this.available.map((e) => e.type).join(', ') || 'none';
    const slotIds = this._slots.map((s) => s.id).join(', ') || 'none';
    this.logger.log(
      `Environments — available: [${availableTypes}] (${this.available.length}); slots: [${slotIds}] (${this._slots.length})`,
    );
  }

  get slots(): EnvironmentConfigInterface[] {
    return this._slots;
  }
}
