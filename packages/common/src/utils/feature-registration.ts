import { Injectable, type Type } from '@nestjs/common';
import { FEATURE_REGISTRATION_KEY } from '../tokens.js';

export interface FeatureRegistration {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Creates a tagged provider class with FEATURE_REGISTRATION_KEY metadata.
 * Used by feature modules in their `forFeature()` static method.
 */
export function registerFeature(id: string, config?: { enabled?: boolean } & Record<string, unknown>): Type<unknown> {
  @Injectable()
  class FeatureRegistrationProvider {}

  const { enabled, ...rest } = config ?? {};

  Reflect.defineMetadata(
    FEATURE_REGISTRATION_KEY,
    {
      id,
      enabled: enabled ?? true,
      config: rest,
    } satisfies FeatureRegistration,
    FeatureRegistrationProvider,
  );

  return FeatureRegistrationProvider;
}
