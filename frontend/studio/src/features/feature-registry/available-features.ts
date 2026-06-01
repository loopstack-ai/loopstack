import { fileExplorerFeature } from '../file-explorer';
import { gitFeature } from '../git';
import { secretsFeature } from '../secrets';
import type { StudioFeature } from './types';

/**
 * Maps backend feature IDs to frontend StudioFeature objects.
 * When the backend registers a feature via `forFeature()`, the `id` here
 * must match the `id` passed to `registerFeature()` on the backend.
 */
export const AVAILABLE_FEATURES: Record<string, StudioFeature> = {
  git: gitFeature,
  fileExplorer: fileExplorerFeature,
  secrets: secretsFeature,
};
