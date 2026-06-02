import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type {
  BlockConfigType,
  DocumentConfigType,
  ToolConfigType,
  UiWidgetType,
  WorkflowType,
} from '@loopstack/contracts/types';

/** A widget reference: either a YAML file path or an inline widget object. */
export type WidgetRef = string | UiWidgetType;

export const BLOCK_CONFIG_METADATA_KEY = Symbol('blockConfig');
export const BLOCK_TYPE_METADATA_KEY = Symbol('blockType');
export const TRANSITIONS_METADATA_KEY = Symbol('transitions');
export const GUARDS_METADATA_KEY = Symbol('guards');

// Block Type Class Decorators
export type BlockType = 'workflow' | 'tool' | 'document';

/** Base block options — used by the internal `Block()` decorator */
export interface BlockOptions {
  /** Explicit name for this block (used as tool identifier in LLM wire format). Falls back to class name if omitted. */
  name?: string;
  /** Human-readable display title (shown in Studio UI). */
  title?: string;
  /** Human-readable description (shown in Studio UI). */
  description?: string;
  /** Widget definition(s): YAML file path(s) or inline widget object(s). */
  widget?: WidgetRef | WidgetRef[];
  /** Zod schema for input/content validation */
  schema?: z.ZodType;
  /** Zod schema for config validation (provided via options.config) */
  configSchema?: z.ZodType;
  /** Document-specific: inline config or YAML path for tags/meta/content. */
  uiConfig?: string | Partial<BlockConfigType>;
}

/** Options for @Tool() decorator */
export interface ToolOptions {
  /** Explicit name for this tool (used as identifier in LLM wire format, e.g. 'git_status'). Falls back to class name if omitted. */
  name?: string;
  /** Human-readable description (shown to LLM for tool-use). */
  description?: string;
  /** Widget definition(s) for custom tool call/result rendering in Studio. */
  widget?: WidgetRef | WidgetRef[];
  /** Zod schema for input validation */
  schema?: z.ZodType;
  /** Zod schema for tool config validation (provided via options.config) */
  configSchema?: z.ZodType;
}

/** Options for @Workflow() decorator */
export interface WorkflowOptions {
  /** Explicit snake_case name for this workflow (e.g. 'agent_example'). Falls back to auto-derived name from class. */
  name?: string;
  /** Human-readable display title (shown in Studio UI). */
  title?: string;
  /** Human-readable description (shown in Studio UI). */
  description?: string;
  /** Widget definition(s): YAML file path(s) or inline widget object(s). */
  widget?: WidgetRef | WidgetRef[];
  /** Zod schema for input validation */
  schema?: z.ZodType;
  /** Zod schema for workflow config validation (provided via options.config) */
  configSchema?: z.ZodType;
  /** Zod schema for state validation (optional — validates state on save/load) */
  stateSchema?: z.ZodType;
}

/** Options for @Document() decorator */
export interface DocumentOptions {
  /** Explicit snake_case name (e.g. 'ask_user'). Falls back to auto-derived from class name. */
  name?: string;
  /** Human-readable display title (shown in Studio UI). */
  title?: string;
  /** Human-readable description (shown in Studio UI). */
  description?: string;
  /** Widget definition(s): YAML file path(s) or inline widget object(s). */
  widget?: WidgetRef | WidgetRef[];
  /** Zod schema for content validation */
  schema?: z.ZodType;
  /** Document-specific config: tags, meta, content. */
  uiConfig?: string | Partial<DocumentConfigType>;
}

export function Block(type: BlockType, options?: BlockOptions): ClassDecorator {
  return (target) => {
    Injectable()(target);
    Reflect.defineMetadata(BLOCK_TYPE_METADATA_KEY, type, target);
    Reflect.defineMetadata(BLOCK_CONFIG_METADATA_KEY, options ?? {}, target);
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

export function getBlockType(target: object): BlockType | undefined {
  return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, target.constructor) as BlockType | undefined;
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
  /** Timeout in ms — kills the transition and triggers the error/retry flow. Default: 300_000 (5 min, via DEFAULT_TRANSITION_TIMEOUT env var). Set to 0 for no timeout. */
  timeout?: number;
}

export interface GuardMetadata {
  transitionMethodName: string;
  guardMethodName: string;
}

export interface TransitionOptions {
  /** Source state. Defaults to 'start' (initial transition) when omitted. */
  from?: string;
  /** Target state. Use 'end' for final transitions. */
  to: string;
  wait?: boolean;
  priority?: number;
  /** Zod schema to validate the transition payload (for wait transitions) or args (for initial transitions) */
  schema?: z.ZodType;
  /** Retry configuration for error handling. Default: unlimited manual retry. */
  retry?: RetryConfig;
  /** Timeout in ms — kills the transition and triggers the error/retry flow. Default: 300_000 (5 min, via DEFAULT_TRANSITION_TIMEOUT env var). Set to 0 for no timeout. */
  timeout?: number;
}

function addTransitionMetadata(target: object, metadata: TransitionMetadata): void {
  const existing = (Reflect.getMetadata(TRANSITIONS_METADATA_KEY, target.constructor) as TransitionMetadata[]) ?? [];
  Reflect.defineMetadata(TRANSITIONS_METADATA_KEY, [...existing, metadata], target.constructor);
}

export function Transition(options: TransitionOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    addTransitionMetadata(target, {
      methodName: String(propertyKey),
      from: options.from ?? 'start',
      to: options.to,
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
