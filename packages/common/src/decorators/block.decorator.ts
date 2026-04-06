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
export const INJECTED_TEMPLATES_METADATA_KEY = Symbol('injectedTemplates');
export const INPUT_METADATA_KEY = Symbol('input');
export const OUTPUT_METADATA_KEY = Symbol('output');
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
  /** Map of template names to file paths (e.g., { system: __dirname + '/templates/system.md' }) */
  templates?: Record<string, string>;
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
  /** Map of template names to file paths (e.g., { system: __dirname + '/templates/system.md' }) */
  templates?: Record<string, string>;
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

// Schema Decorators

/**
 * @deprecated Use `schema` in the class decorator instead (e.g., `@Tool({ schema })`, `@Workflow({ schema })`).
 */
export interface InputOptions {
  schema?: z.ZodType;
}

/**
 * @deprecated Use `schema` in the class decorator instead.
 */
export interface InputMetadata extends InputOptions {
  name: string | symbol;
}

/**
 * @deprecated Use `schema` in the class decorator instead (e.g., `@Tool({ schema })`, `@Workflow({ schema })`).
 * This decorator will be removed in a future major version.
 */
export function Input(options: InputOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(INPUT_METADATA_KEY, { ...options, name: propertyKey }, target.constructor);
  };
}

export interface OutputOptions {
  schema?: z.ZodType;
}

export interface OutputMetadata extends OutputOptions {
  name: string | symbol;
}

export function Output(options?: OutputOptions): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(OUTPUT_METADATA_KEY, { ...options, name: propertyKey }, target.constructor);
  };
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

// Templates Injection Decorator
export function InjectTemplates(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(INJECTED_TEMPLATES_METADATA_KEY, propertyKey, target.constructor);
  };
}

// Transition Decorators

export interface TransitionMetadata {
  methodName: string;
  from: string;
  to: string;
  wait?: boolean;
  priority?: number;
}

export interface GuardMetadata {
  transitionMethodName: string;
  guardMethodName: string;
}

export interface InitialOptions {
  to: string;
  wait?: boolean;
  priority?: number;
}

export interface TransitionOptions {
  from: string;
  to: string;
  wait?: boolean;
  priority?: number;
}

export interface FinalOptions {
  from: string;
  wait?: boolean;
  priority?: number;
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
