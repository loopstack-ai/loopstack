import { Injectable, type Type } from '@nestjs/common';
import { STUDIO_APP_EXTENSION_KEY } from '../tokens.js';

export interface StudioAppExtension {
  /** Section bucket in the resolved StudioAppConfig.extensions map. */
  section: string;
  /** Arbitrary payload exposed under that section to the Studio API. */
  data: unknown;
}

/**
 * Creates a tagged provider class with STUDIO_APP_EXTENSION_KEY metadata.
 * Feature modules use this to contribute arbitrary config sections to the
 * StudioAppConfig of every `@StudioApp` that imports them. All providers
 * with the same `section` are grouped into `extensions[section]` and
 * exposed to the Studio frontend.
 *
 * Advanced/internal: the only current consumer is `RemoteClientModule`,
 * which registers environment slots under the `environments` section.
 *
 * @param section - bucket name in StudioAppConfig.extensions
 * @param data - arbitrary payload (must be JSON-serialisable)
 */
export function registerStudioExtension(section: string, data: unknown): Type<unknown> {
  @Injectable()
  class StudioAppExtensionProvider {}

  Reflect.defineMetadata(
    STUDIO_APP_EXTENSION_KEY,
    { section, data } satisfies StudioAppExtension,
    StudioAppExtensionProvider,
  );

  return StudioAppExtensionProvider;
}
