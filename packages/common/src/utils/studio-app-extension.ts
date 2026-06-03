import { Injectable, type Type } from '@nestjs/common';
import { STUDIO_APP_EXTENSION_KEY } from '../tokens.js';

export interface StudioAppExtension {
  section: string;
  data: unknown;
}

/**
 * Creates a tagged provider class with STUDIO_APP_EXTENSION_KEY metadata.
 * Used by feature modules to contribute config sections to the StudioAppConfig.
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
