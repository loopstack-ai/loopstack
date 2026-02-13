import { Inject, Injectable, InjectionToken } from '@nestjs/common';
import { z } from 'zod';
import type { BlockConfigType } from '@loopstack/contracts/types';

export const BLOCK_CONFIG_METADATA_KEY = Symbol('blockConfig');
export const BLOCK_TYPE_METADATA_KEY = Symbol('blockType');
export const INJECTED_TOOLS_METADATA_KEY = Symbol('injectedTools');
export const INJECTED_DOCUMENTS_METADATA_KEY = Symbol('injectedDocuments');
export const INJECTED_WORKFLOWS_METADATA_KEY = Symbol('injectedWorkflows');
export const INJECTED_WORKFLOW_OPTIONS_KEY = Symbol('injectedWorkflowOptions');
export const TEMPLATE_HELPER_METADATA_KEY = Symbol('templateHelper');
export const INPUT_METADATA_KEY = Symbol('input');
export const CONTEXT_METADATA_KEY = Symbol('context');
export const RUNTIME_METADATA_KEY = Symbol('runtime');
export const STATE_METADATA_KEY = Symbol('state');
export const OUTPUT_METADATA_KEY = Symbol('output');

export interface InjectedWorkflowOptions {
  visible?: boolean;
  stateless?: boolean;
}

export interface InjectWorkflowDecoratorOptions {
  token?: InjectionToken;
  options?: InjectedWorkflowOptions;
}

// Block Type Class Decorators
export type BlockType = 'workflow' | 'tool' | 'document' | 'workspace';

export interface BlockOptions {
  config?: Partial<BlockConfigType>;
  configFile?: string;
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

export function Workflow(options?: BlockOptions): ClassDecorator {
  return Block('workflow', options);
}

export function Tool(options?: BlockOptions): ClassDecorator {
  return Block('tool', options);
}

export function Document(options?: BlockOptions): ClassDecorator {
  return Block('document', options);
}

export function Workspace(options?: BlockOptions): ClassDecorator {
  return Block('workspace', options);
}

export function getBlockType(target: object): BlockType | undefined {
  return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, target.constructor) as BlockType | undefined;
}

// Schema Decorators
export interface InputOptions {
  schema?: z.ZodType;
}

export interface InputMetadata extends InputOptions {
  name: string | symbol;
}

export function Input(options: InputOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(INPUT_METADATA_KEY, { ...options, name: propertyKey }, target.constructor);
  };
}

export interface ContextOptions {
  schema?: z.ZodType;
}

export interface ContextMetadata extends ContextOptions {
  name: string | symbol;
}

export function Context(options?: ContextOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(CONTEXT_METADATA_KEY, { ...options, name: propertyKey }, target.constructor);
  };
}

export interface RuntimeOptions {
  schema?: z.ZodType;
}

export interface RuntimeMetadata extends ContextOptions {
  name: string | symbol;
}

export function Runtime(options?: RuntimeOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Reflect.defineMetadata(RUNTIME_METADATA_KEY, { ...options, name: propertyKey }, target.constructor);
  };
}

function validateStateSchema(schema: z.ZodType): void {
  const forbiddenKeys = ['args', 'metadata'];

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, unknown>;
    const keys = Object.keys(shape);

    for (const key of forbiddenKeys) {
      if (keys.includes(key)) {
        throw new Error(`State schema cannot contain '${key}' key`);
      }
    }
  }
}

export interface StateOptions {
  schema?: z.ZodType;
}

export interface StateMetadata extends StateOptions {
  name: string | symbol;
}

export function State(options?: StateOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    if (options?.schema) {
      validateStateSchema(options.schema);
    }
    Reflect.defineMetadata(STATE_METADATA_KEY, { ...options, name: propertyKey }, target.constructor);
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

// Config Helpers
export function getWorkflowOptions(target: object, propertyKey: string | symbol): InjectedWorkflowOptions {
  return (
    (Reflect.getMetadata(INJECTED_WORKFLOW_OPTIONS_KEY, target, propertyKey) as
      | InjectedWorkflowOptions
      | undefined) ?? {
      visible: true,
      stateless: false,
    }
  );
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

export function InjectDocument(token?: InjectionToken): PropertyDecorator & MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const type = token ?? (Reflect.getMetadata('design:type', target, propertyKey) as InjectionToken | undefined);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingDocuments =
      (Reflect.getMetadata(INJECTED_DOCUMENTS_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(INJECTED_DOCUMENTS_METADATA_KEY, [...existingDocuments, propertyKey], target);
  };
}

export function InjectWorkflow(options?: InjectWorkflowDecoratorOptions): PropertyDecorator & MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const token = options?.token;
    const config: InjectedWorkflowOptions = {
      visible: true,
      ...options?.options,
    };

    const type = token ?? (Reflect.getMetadata('design:type', target, propertyKey) as InjectionToken | undefined);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingWorkflows =
      (Reflect.getMetadata(INJECTED_WORKFLOWS_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(INJECTED_WORKFLOWS_METADATA_KEY, [...existingWorkflows, propertyKey], target);

    Reflect.defineMetadata(INJECTED_WORKFLOW_OPTIONS_KEY, config, target, propertyKey);
  };
}

// Method Decorators
export function DefineHelper(): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existing =
      (Reflect.getMetadata(TEMPLATE_HELPER_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(TEMPLATE_HELPER_METADATA_KEY, [...existing, propertyKey], target);
  };
}
