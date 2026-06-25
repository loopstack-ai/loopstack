import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { z } from 'zod';
import type { StaticDocumentMeta, UiWidgetType } from '@loopstack/contracts/types';
import { getCallerFile } from '../utils/caller-file.js';

/** A widget reference: either a YAML file path or an inline widget object. */
export type WidgetRef = string | UiWidgetType;

export const BLOCK_CONFIG_METADATA_KEY = Symbol('blockConfig');
export const BLOCK_TYPE_METADATA_KEY = Symbol('blockType');
export const BLOCK_DIR_METADATA_KEY = Symbol('blockDir');
export const TRANSITIONS_METADATA_KEY = Symbol('transitions');
export const GUARDS_METADATA_KEY = Symbol('guards');

/** Global registry of all @Document()-decorated classes (populated at decorator time). */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const globalDocumentRegistry = new Set<Function>();

/** Returns all classes that have been decorated with @Document(). */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getRegisteredDocuments(): Set<Function> {
  return globalDocumentRegistry;
}

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
  /** Default tags assigned to every instance of this document. */
  tags?: string[];
  /** Static document meta — served via config endpoint, not persisted per instance. */
  meta?: StaticDocumentMeta;
  /** Document-only: marks the type as framework-internal — excluded from API responses/live updates. */
  internal?: boolean;
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
  /** Default tags assigned to every instance of this document. */
  tags?: string[];
  /** Static document meta — served via config endpoint, not persisted per instance. */
  meta?: StaticDocumentMeta;
  /**
   * Marks this document type as framework-internal. Internal documents are persisted and
   * readable server-side (e.g. by LLM providers building conversation history) but excluded
   * from the document API responses and live updates that Studio consumes. Use for context
   * messages, system prompts, or any plumbing the user shouldn't see in the UI.
   */
  internal?: boolean;
}

/** @internal Resolves a relative widget path against `dir`; passes through absolute paths and inline objects. */
function resolveWidgetRef(ref: WidgetRef, dir: string): WidgetRef {
  if (typeof ref !== 'string') return ref;
  if (ref.startsWith('./') || ref.startsWith('../')) {
    return path.resolve(dir, ref);
  }
  return ref;
}

/** @internal Normalises `widget` option — resolves relative paths in single or array form. */
function resolveWidgetOption(
  widget: WidgetRef | WidgetRef[] | undefined,
  dir: string,
): WidgetRef | WidgetRef[] | undefined {
  if (widget === undefined) return undefined;
  if (Array.isArray(widget)) {
    return widget.map((w) => resolveWidgetRef(w, dir));
  }
  return resolveWidgetRef(widget, dir);
}

/**
 * Core block decorator. Captures the caller's directory at decorator-evaluation time
 * and resolves any relative `widget` paths against it. The captured directory is
 * stored under `BLOCK_DIR_METADATA_KEY`.
 *
 * The optional `callerFile` parameter lets wrapping decorators (`Workflow`, `Tool`, `Document`)
 * pass in the user's actual call site instead of their own location.
 */
export function Block(type: BlockType, options?: BlockOptions, callerFile?: string): ClassDecorator {
  const sourceFile = callerFile ?? getCallerFile();
  const dir = path.dirname(sourceFile);
  const resolvedOptions: BlockOptions = options ? { ...options, widget: resolveWidgetOption(options.widget, dir) } : {};
  return (target) => {
    Injectable()(target);
    Reflect.defineMetadata(BLOCK_TYPE_METADATA_KEY, type, target);
    Reflect.defineMetadata(BLOCK_CONFIG_METADATA_KEY, resolvedOptions, target);
    Reflect.defineMetadata(BLOCK_DIR_METADATA_KEY, dir, target);
  };
}

/**
 * Marks a class as a Loopstack workflow. The class must extend `BaseWorkflow`.
 *
 * Also applies `@Injectable()` so the workflow can be registered as a NestJS provider
 * and constructor-injected (tools, sub-workflows, services).
 *
 * Identifier resolution: `options.name` ?? class name with `Workflow` suffix stripped,
 * snake_cased (e.g. `ChatWorkflow` → `chat`).
 *
 * Relative `widget:` paths (`./foo.ui.yaml`, `../shared/foo.ui.yaml`) are resolved
 * against this file's directory at decorator-evaluation time.
 *
 * @see WorkflowOptions for available options.
 */
export function Workflow(options?: WorkflowOptions): ClassDecorator {
  return Block('workflow', options as BlockOptions, getCallerFile());
}

/**
 * Marks a class as a Loopstack tool. The class must extend `BaseTool`.
 *
 * Also applies `@Injectable()` so the tool can be registered as a NestJS provider
 * and constructor-injected into workflows and other tools.
 *
 * Identifier resolution: `options.name` ?? class name (as-is). Always set
 * `options.name` to a snake_case identifier — it appears in the LLM tool-calling
 * wire format.
 *
 * Relative `widget:` paths (`./foo.ui.yaml`, `../shared/foo.ui.yaml`) are resolved
 * against this file's directory at decorator-evaluation time.
 *
 * @see ToolOptions for available options.
 */
export function Tool(options?: ToolOptions): ClassDecorator {
  return Block('tool', options as BlockOptions, getCallerFile());
}

/**
 * Marks a class as a Document DTO.
 *
 * Unlike `@Tool` and `@Workflow`, documents are NOT injectable NestJS providers —
 * they are plain data classes. Their schema, widget, and meta are read from
 * decorator metadata when documents are saved via `documentStore.save(DocClass, …)`.
 *
 * Identifier resolution: `options.name` ?? class name with `Document` suffix
 * stripped, snake_cased (e.g. `AskUserDocument` → `ask_user`).
 *
 * @see DocumentOptions for available options.
 */
export function Document(options?: DocumentOptions): ClassDecorator {
  const sourceFile = getCallerFile();
  const dir = path.dirname(sourceFile);
  const resolvedOptions: DocumentOptions | undefined = options
    ? { ...options, widget: resolveWidgetOption(options.widget, dir) }
    : undefined;
  return (target) => {
    // Documents are NOT @Injectable — they are plain DTOs, not NestJS providers
    Reflect.defineMetadata(BLOCK_TYPE_METADATA_KEY, 'document', target);
    Reflect.defineMetadata(BLOCK_DIR_METADATA_KEY, dir, target);
    if (resolvedOptions) {
      Reflect.defineMetadata(BLOCK_CONFIG_METADATA_KEY, resolvedOptions as BlockOptions, target);
    }
    globalDocumentRegistry.add(target);
  };
}

export function getBlockType(target: object): BlockType | undefined {
  return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, target.constructor) as BlockType | undefined;
}

// Retry / error-routing defaults

const RETRY_DEFAULTS = {
  attempts: -1,
  delay: 1000,
  backoff: 'exponential' as const,
  maxDelay: 30000,
};

// Transition Decorators

export interface TransitionMetadata {
  methodName: string;
  from: string;
  to: string;
  wait?: boolean;
  priority?: number;
  schema?: z.ZodType;
  /** Number of auto-retry attempts. -1 = unlimited manual retry (default). 0 = no auto-retry. N>0 = up to N auto-retries. */
  retryAttempts: number;
  /** Base delay in ms between auto-retries. */
  retryDelay: number;
  /** Backoff strategy for auto-retries. */
  retryBackoff: 'fixed' | 'exponential';
  /** Cap in ms for exponential backoff. */
  retryMaxDelay: number;
  /** Where to re-enter on auto-retry. When unset, the failing transition is re-run. When set, `place` is moved to this target and whatever transition fires from there handles the retry. */
  retryTarget?: string;
  /** Where to go when retries are exhausted, or when the failure isn't retryable (e.g. sub-workflow callback with status `failed` / `canceled`). A `wait: true` transition from this place typically does the recovery. */
  errorPlace?: string;
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
  /** Number of auto-retry attempts. -1 = unlimited manual retry (default). 0 = no auto-retry. N>0 = up to N auto-retries. */
  retryAttempts?: number;
  /** Base ms between auto-retries. Default: 1000. */
  retryDelay?: number;
  /** Backoff strategy for auto-retries. Default: 'exponential'. */
  retryBackoff?: 'fixed' | 'exponential';
  /** Cap in ms for exponential backoff. Default: 30000. */
  retryMaxDelay?: number;
  /** Where to re-enter on auto-retry. When unset, the failing transition is re-run. When set, `place` is moved to this target on each retry. */
  retryTarget?: string;
  /** Where to go when retries are exhausted, or when the failure isn't retryable (e.g. sub-workflow callback with status `failed` / `canceled`). */
  errorPlace?: string;
  /** Timeout in ms — kills the transition and triggers the error/retry flow. Default: 300_000 (5 min, via DEFAULT_TRANSITION_TIMEOUT env var). Set to 0 for no timeout. */
  timeout?: number;
}

function addTransitionMetadata(target: object, metadata: TransitionMetadata): void {
  const existing = (Reflect.getMetadata(TRANSITIONS_METADATA_KEY, target.constructor) as TransitionMetadata[]) ?? [];
  Reflect.defineMetadata(TRANSITIONS_METADATA_KEY, [...existing, metadata], target.constructor);
}

export function Transition(options: TransitionOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    // When `errorPlace` is set without `retryAttempts`, default to 0 auto-retries
    // (route straight to errorPlace on first failure). Otherwise default to unlimited
    // manual retry.
    const defaultAttempts = options.errorPlace !== undefined ? 0 : RETRY_DEFAULTS.attempts;
    addTransitionMetadata(target, {
      methodName: String(propertyKey),
      from: options.from ?? 'start',
      to: options.to,
      wait: options.wait,
      priority: options.priority,
      schema: options.schema,
      retryAttempts: options.retryAttempts ?? defaultAttempts,
      retryDelay: options.retryDelay ?? RETRY_DEFAULTS.delay,
      retryBackoff: options.retryBackoff ?? RETRY_DEFAULTS.backoff,
      retryMaxDelay: options.retryMaxDelay ?? RETRY_DEFAULTS.maxDelay,
      retryTarget: options.retryTarget,
      errorPlace: options.errorPlace,
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
