import type { Type } from '@nestjs/common';
import type { z } from 'zod';
import type { BaseWorkflow } from '../base/base-workflow.js';
import { getBlockArgsSchema, getWorkflowIdentifier } from '../utils/block-metadata.utils.js';
import { deriveAppIdentifier } from '../utils/identifier.utils.js';

export const STUDIO_APP_KEY = 'loopstack:studio-app';
export const STUDIO_CONTROLLER_KEY = 'loopstack:studio-controller';
export const STUDIO_ENDPOINT_KEY = 'loopstack:studio-endpoint';

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

export interface StudioControllerOptions {
  title?: string;
  description?: string;
}

export function StudioController(options?: StudioControllerOptions): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(STUDIO_CONTROLLER_KEY, options ?? {}, target);
  };
}

/** Single-workflow endpoint options. */
export interface StudioEndpointSingleOptions {
  title: string;
  description?: string;
  workflow: Type<BaseWorkflow<any, any>>;
  workflows?: never;
  schema?: z.ZodType;
}

/** Multi-workflow endpoint options — one endpoint serves multiple workflows via :workflowName path param. */
export interface StudioEndpointMultiOptions {
  title?: string;
  description?: string;
  workflow?: never;
  workflows: Type<BaseWorkflow<any, any>>[];
  schema?: never;
}

export type StudioEndpointOptions = StudioEndpointSingleOptions | StudioEndpointMultiOptions;

/** Stored metadata for a single-workflow endpoint. */
export interface StudioEndpointSingleMeta {
  kind: 'single';
  title: string;
  description?: string;
  workflowClass: Type<BaseWorkflow<any, any>>;
  schema?: z.ZodType;
}

/** Stored metadata for a multi-workflow endpoint. */
export interface StudioEndpointMultiMeta {
  kind: 'multi';
  title?: string;
  description?: string;
  workflows: { workflowClass: Type<BaseWorkflow<any, any>>; identifier: string; schema?: z.ZodType }[];
}

export type StudioEndpointMeta = StudioEndpointSingleMeta | StudioEndpointMultiMeta;

export function StudioEndpoint(options: StudioEndpointOptions): MethodDecorator {
  return (target, propertyKey) => {
    let meta: StudioEndpointMeta;

    if (options.workflows) {
      meta = {
        kind: 'multi',
        title: options.title,
        description: options.description,
        workflows: options.workflows.map((wf) => ({
          workflowClass: wf,
          identifier: getWorkflowIdentifier(wf.prototype),
          schema: getBlockArgsSchema(wf.prototype),
        })),
      };
    } else {
      const schema = options.schema ?? getBlockArgsSchema(options.workflow.prototype);
      meta = {
        kind: 'single',
        title: options.title,
        description: options.description,
        workflowClass: options.workflow,
        schema,
      };
    }

    Reflect.defineMetadata(STUDIO_ENDPOINT_KEY, meta, target, propertyKey);
  };
}
