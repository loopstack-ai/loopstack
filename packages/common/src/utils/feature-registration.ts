import { Injectable, type Type } from '@nestjs/common';
import { FEATURE_REGISTRATION_KEY } from '../tokens.js';

export interface FeatureRegistration {
  id: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Creates a tagged provider class with FEATURE_REGISTRATION_KEY metadata.
 * Feature modules return this from their `forFeature()` static method to
 * register themselves as a Studio feature on the importing `@StudioApp`.
 *
 * @param id - feature identifier; must match the key in the Studio frontend's
 *   AVAILABLE_FEATURES registry. Examples: 'git', 'fileExplorer', 'secrets'.
 * @param config - optional config. `enabled` toggles the feature on/off
 *   (defaults to true); any other fields are forwarded as the feature's runtime
 *   config and exposed to the frontend.
 *
 * Example:
 * ```ts
 * @Module({ providers: [...] })
 * export class MyFeatureModule {
 *   static forFeature(config?: { enabled?: boolean }): DynamicModule {
 *     return { module: MyFeatureModule, providers: [registerFeature('myFeature', config)] };
 *   }
 * }
 * ```
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
