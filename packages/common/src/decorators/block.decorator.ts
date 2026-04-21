import { Inject, Injectable, InjectionToken } from '@nestjs/common';
import { z } from 'zod';
import type {
  BlockConfigType,
  DocumentConfigType,
  ToolConfigType,
  WorkflowType,
  WorkspaceType,
} from '@loopstack/contracts/types';

export const BLOCK_CONFIG_METADATA_KEY = Symbol('blockConfig');
export const BLOCK_TYPE_METADATA_KEY = Symbol('blockType');
export const INJECTED_TOOLS_METADATA_KEY = Symbol('injectedTools');
export const INJECTED_DOCUMENTS_METADATA_KEY = Symbol('injectedDocuments');
export const INJECTED_WORKFLOWS_METADATA_KEY = Symbol('injectedWorkflows');
export const TRANSITIONS_METADATA_KEY = Symbol('transitions');
export const GUARDS_METADATA_KEY = Symbol('guards');
export const PASS_THROUGH_METADATA_KEY = Symbol('passThrough');

export interface InjectWorkflowDecoratorOptions {
  token?: InjectionToken;
}

// Block Type Class Decorators
export type BlockType = 'workflow' | 'tool' | 'document' | 'workspace';

/** Base block options — used by the internal `Block()` decorator */
export interface BlockOptions {
  /** Inline config object or path to a YAML file containing UI config */
  uiConfig?: string | Partial<BlockConfigType>;
  /** Zod schema for input/content validation */
  schema?: z.ZodType;
}

/** Options for @Tool() decorator */
export interface ToolOptions {
  /** Inline config object or path to a YAML file containing UI config */
  uiConfig?: string | Partial<ToolConfigType>;
  /** Zod schema for input validation */
  schema?: z.ZodType;
}

/** Options for @Workflow() decorator */
export interface WorkflowOptions {
  /** Inline config object or path to a YAML file containing UI config */
  uiConfig?: string | Partial<WorkflowType>;
  /** Zod schema for input validation */
  schema?: z.ZodType;
}

/** Options for @Document() decorator */
export interface DocumentOptions {
  /** Inline config object or path to a YAML file containing UI config */
  uiConfig?: string | Partial<DocumentConfigType>;
  /** Zod schema for content validation */
  schema?: z.ZodType;
}

/** Options for @Workspace() decorator */
export interface WorkspaceOptions {
  /** Inline config object or path to a YAML file containing UI config */
  uiConfig?: string | Partial<WorkspaceType>;
}

export function Block(type: BlockType, options?: BlockOptions): ClassDecorator {
  return (target) => {
    Injectable()(target);
    Reflect.defineMetadata(BLOCK_TYPE_METADATA_KEY, type, target);
    if (options) {
      Reflect.defineMetadata(BLOCK_CONFIG_METADATA_KEY, options, target);
    }
  };
}

export function Workflow(options?: WorkflowOptions): ClassDecorator {
  return Block('workflow', options as BlockOptions);
}

export function Tool(options?: ToolOptions): ClassDecorator {
  return Block('tool', options as BlockOptions);
}

/**
 * Marks a class as a Document DTO.
 * Unlike @Tool and @Workflow, documents are NOT injectable NestJS providers.
 * They are plain data classes whose schema and config are read from decorator metadata.
 */
export function Document(options?: DocumentOptions): ClassDecorator {
  return (target) => {
    // Documents are NOT @Injectable — they are plain DTOs, not NestJS providers
    Reflect.defineMetadata(BLOCK_TYPE_METADATA_KEY, 'document', target);
    if (options) {
      Reflect.defineMetadata(BLOCK_CONFIG_METADATA_KEY, options as BlockOptions, target);
    }
  };
}

export function Workspace(options?: WorkspaceOptions): ClassDecorator {
  return Block('workspace', options as BlockOptions);
}

export function getBlockType(target: object): BlockType | undefined {
  return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, target.constructor) as BlockType | undefined;
}

// Injection Property Decorators
export function InjectTool(token?: InjectionToken): PropertyDecorator & MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const type = token ?? (Reflect.getMetadata('design:type', target, propertyKey) as InjectionToken | undefined);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingTools =
      (Reflect.getMetadata(INJECTED_TOOLS_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(INJECTED_TOOLS_METADATA_KEY, [...existingTools, propertyKey], target);
  };
}

/**
 * @deprecated Documents are now plain DTOs. Use `this.repository.save(DocumentClass, data)` instead of injecting documents.
 */
export function InjectDocument(_token?: InjectionToken): PropertyDecorator & MethodDecorator {
  return (_target: object, _propertyKey: string | symbol) => {
    // No-op: documents are no longer injectable
  };
}

export function InjectWorkflow(options?: InjectWorkflowDecoratorOptions): PropertyDecorator & MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const token = options?.token;
    const type = token ?? (Reflect.getMetadata('design:type', target, propertyKey) as InjectionToken | undefined);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingWorkflows =
      (Reflect.getMetadata(INJECTED_WORKFLOWS_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(INJECTED_WORKFLOWS_METADATA_KEY, [...existingWorkflows, propertyKey], target);
  };
}

// Retry Configuration

/** Shorthand (number of auto-retry attempts) or full config object. */
export type RetryConfig =
  | number
  | {
      /** Number of auto-retry attempts. -1 = unlimited manual retry (default). 0+ = auto-retry count. */
      attempts?: number;
      /** Base delay in ms between retries. Default: 1000 */
      delay?: number;
      /** Backoff strategy. Default: 'exponential' */
      backoff?: 'fixed' | 'exponential';
      /** Maximum delay cap in ms for exponential backoff. Default: 30000 */
      maxDelay?: number;
      /** Custom error place to transition to when retries are exhausted. */
      place?: string;
    };

/** Fully resolved retry config with all defaults applied. */
export interface NormalizedRetryConfig {
  attempts: number;
  delay: number;
  backoff: 'fixed' | 'exponential';
  maxDelay: number;
  place?: string;
}

const RETRY_DEFAULTS: Omit<NormalizedRetryConfig, 'place'> = {
  attempts: -1,
  delay: 1000,
  backoff: 'exponential',
  maxDelay: 30000,
};

export function normalizeRetryConfig(config?: RetryConfig): NormalizedRetryConfig {
  if (config === undefined) {
    return { ...RETRY_DEFAULTS };
  }
  if (typeof config === 'number') {
    return { ...RETRY_DEFAULTS, attempts: config };
  }
  const hasPlace = config.place !== undefined;
  return {
    attempts: config.attempts ?? (hasPlace ? 0 : RETRY_DEFAULTS.attempts),
    delay: config.delay ?? RETRY_DEFAULTS.delay,
    backoff: config.backoff ?? RETRY_DEFAULTS.backoff,
    maxDelay: config.maxDelay ?? RETRY_DEFAULTS.maxDelay,
    place: config.place,
  };
}

// Transition Decorators

export interface TransitionMetadata {
  methodName: string;
  from: string;
  to: string;
  wait?: boolean;
  priority?: number;
  schema?: z.ZodType;
  retry?: NormalizedRetryConfig;
  /** Timeout in ms — kills the transition and triggers the error/retry flow. */
  timeout?: number;
}

export interface GuardMetadata {
  transitionMethodName: string;
  guardMethodName: string;
}

export interface InitialOptions {
  to: string;
  wait?: boolean;
  priority?: number;
  /** Zod schema to validate the transition payload (for wait transitions) or args (for @Initial) */
  schema?: z.ZodType;
  /** Retry configuration for error handling. Default: unlimited manual retry. */
  retry?: RetryConfig;
  /** Timeout in ms — kills the transition and triggers the error/retry flow. */
  timeout?: number;
}

export interface TransitionOptions {
  from: string;
  to: string;
  wait?: boolean;
  priority?: number;
  /** Zod schema to validate the transition payload */
  schema?: z.ZodType;
  /** Retry configuration for error handling. Default: unlimited manual retry. */
  retry?: RetryConfig;
  /** Timeout in ms — kills the transition and triggers the error/retry flow. */
  timeout?: number;
}

export interface FinalOptions {
  from: string;
  wait?: boolean;
  priority?: number;
  /** Zod schema to validate the transition payload */
  schema?: z.ZodType;
  /** Retry configuration for error handling. Default: unlimited manual retry. */
  retry?: RetryConfig;
  /** Timeout in ms — kills the transition and triggers the error/retry flow. */
  timeout?: number;
}

function addTransitionMetadata(target: object, metadata: TransitionMetadata): void {
  const existing = (Reflect.getMetadata(TRANSITIONS_METADATA_KEY, target.constructor) as TransitionMetadata[]) ?? [];
  Reflect.defineMetadata(TRANSITIONS_METADATA_KEY, [...existing, metadata], target.constructor);
}

export function Initial(options: InitialOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    addTransitionMetadata(target, {
      methodName: String(propertyKey),
      from: 'start',
      to: options.to,
      wait: options.wait,
      priority: options.priority,
      schema: options.schema,
      retry: normalizeRetryConfig(options.retry),
      timeout: options.timeout,
    });
  };
}

export function Transition(options: TransitionOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    addTransitionMetadata(target, {
      methodName: String(propertyKey),
      from: options.from,
      to: options.to,
      wait: options.wait,
      priority: options.priority,
      schema: options.schema,
      retry: normalizeRetryConfig(options.retry),
      timeout: options.timeout,
    });
  };
}

export function Final(options: FinalOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    addTransitionMetadata(target, {
      methodName: String(propertyKey),
      from: options.from,
      to: 'end',
      wait: options.wait,
      priority: options.priority,
      schema: options.schema,
      retry: normalizeRetryConfig(options.retry),
      timeout: options.timeout,
    });
  };
}

export function Guard(guardMethodName: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existing = (Reflect.getMetadata(GUARDS_METADATA_KEY, target.constructor) as GuardMetadata[]) ?? [];
    Reflect.defineMetadata(
      GUARDS_METADATA_KEY,
      [...existing, { transitionMethodName: String(propertyKey), guardMethodName }],
      target.constructor,
    );
  };
}

/**
 * Marks a property as pass-through — the proxy will NOT intercept it
 * for state management. The property value is read directly from the
 * instance, bypassing the StateManager.
 *
 * Use this for properties wired by the framework at runtime (e.g. `ctx`).
 */
export function PassThrough(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existing = (Reflect.getMetadata(PASS_THROUGH_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(PASS_THROUGH_METADATA_KEY, [...existing, propertyKey], target);
  };
}
