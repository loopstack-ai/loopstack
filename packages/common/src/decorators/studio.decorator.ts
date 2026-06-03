import type { Type } from '@nestjs/common';
import type { BaseWorkflow } from '../base/base-workflow.js';
import { deriveAppIdentifier } from '../utils/identifier.utils.js';

export const STUDIO_APP_KEY = 'loopstack:studio-app';

export interface StudioWidgetConfig {
  widget: string;
  options?: Record<string, unknown>;
}

export interface StudioUiConfig {
  widgets?: StudioWidgetConfig[];
  sidebar?: boolean;
  workflowHistory?: boolean;
  workflowNavigation?: boolean;
  debugWorkflow?: boolean;
}

export interface StudioAppOptions {
  /** Explicit snake_case identifier. Fallback: derived from class name (Module → App). */
  app?: string;
  /** Display name (required). */
  title: string;
  /** Human-readable description. */
  description?: string;
  /** Developer-defined UI preferences. */
  ui?: StudioUiConfig;
  /** Workflow classes that are launchable from Studio. */
  workflows?: Type<BaseWorkflow<any, any>>[];
}

/** Resolved metadata stored on the module class. */
export interface StudioAppMetadata extends StudioAppOptions {
  /** Resolved identifier (always set). */
  app: string;
}

/**
 * Marks a NestJS module as a Loopstack App — the single source of truth
 * for app identity, UI config, and developer-defined settings.
 */
export function StudioApp(options: StudioAppOptions): ClassDecorator {
  return (target) => {
    const metadata: StudioAppMetadata = {
      ...options,
      app: options.app ?? deriveAppIdentifier(target.name),
    };
    Reflect.defineMetadata(STUDIO_APP_KEY, metadata, target);
  };
}
