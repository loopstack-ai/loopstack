import { Inject, InjectionToken } from '@nestjs/common';
import { z } from 'zod';
import type { BlockConfigType } from '@loopstack/contracts/types';

export const BLOCK_CONFIG_METADATA_KEY = Symbol('blockConfig');
export const BLOCK_TYPE_METADATA_KEY = Symbol('blockType');
export const INJECTED_TOOLS_METADATA_KEY = Symbol('injectedTools');
export const INJECTED_DOCUMENTS_METADATA_KEY = Symbol('injectedDocuments');
export const INJECTED_WORKFLOWS_METADATA_KEY = Symbol('injectedWorkflows');
export const INJECTED_WORKFLOW_OPTIONS_KEY = Symbol('injectedWorkflowOptions');
export const TEMPLATE_HELPER_METADATA_KEY = Symbol('templateHelper');
export const ARGS_SCHEMA_METADATA_KEY = Symbol('argsSchema');
export const STATE_SCHEMA_METADATA_KEY = Symbol('stateSchema');
export const RESULT_SCHEMA_METADATA_KEY = Symbol('resultSchema');

export interface InjectedWorkflowOptions {
  visible?: boolean;
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
export function WithArguments<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(ARGS_SCHEMA_METADATA_KEY, schema, target);
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

export function WithState<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target) => {
    validateStateSchema(schema);
    Reflect.defineMetadata(STATE_SCHEMA_METADATA_KEY, schema, target);
  };
}

export function WithResult<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target) => {
    validateStateSchema(schema);
    Reflect.defineMetadata(RESULT_SCHEMA_METADATA_KEY, schema, target);
  };
}

// Config Helpers
export function getWorkflowOptions(target: object, propertyKey: string | symbol): InjectedWorkflowOptions {
  return (
    (Reflect.getMetadata(INJECTED_WORKFLOW_OPTIONS_KEY, target, propertyKey) as
      | InjectedWorkflowOptions
      | undefined) ?? {
      visible: true,
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
