import type { Type } from '@nestjs/common';
import type { BaseWorkflow } from '../base/base-workflow.js';
import { deriveAppIdentifier } from '../utils/identifier.utils.js';

export const STUDIO_APP_KEY = 'loopstack:studio-app';

export interface StudioWidgetConfig {
  widget: string;
  options?: Record<string, unknown>;
}

export interface StudioUiConfig {
  /**
   * Widgets to render in the app's Studio surface. Each widget is identified
   * by a name and may carry widget-specific options.
   */
  widgets?: StudioWidgetConfig[];
}

/**
 * Options for the `@StudioApp()` decorator — the app identity, title, workflows,
 * and UI config that make a module appear as a launchable app in Studio.
 *
 * @public
 */
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
  workflows?: Type<BaseWorkflow<any>>[];
}

/** Resolved metadata stored on the module class. */
export interface StudioAppMetadata extends StudioAppOptions {
  /** Resolved identifier (always set). */
  app: string;
}

/**
 * Marks a NestJS module as a Loopstack App — the single source of truth
 * for app identity, UI config, and developer-defined settings.
 *
 * @public
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
