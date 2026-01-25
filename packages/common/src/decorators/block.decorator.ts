import { Inject, InjectionToken } from '@nestjs/common';
import { z } from 'zod';
import { BlockOptions } from '../interfaces';
import { buildConfig } from '../utils/block-config.builder';

export const BLOCK_METADATA_KEY = Symbol('block');
export const INPUT_METADATA_KEY = Symbol('input');
export const OUTPUT_METADATA_KEY = Symbol('output');
export const TOOL_METADATA_KEY = Symbol('tool');
export const DOCUMENT_METADATA_KEY = Symbol('document');
export const WORKFLOW_METADATA_KEY = Symbol('workflow');
export const TEMPLATE_HELPER_METADATA_KEY = Symbol('templateHelper');

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Constructor = Function & {
  prototype: object;
  argsSchema?: z.ZodType;
  stateSchema?: z.ZodType;
  resultSchema?: z.ZodType;
  blockConfig?: ReturnType<typeof buildConfig>;
  blockTools?: string[];
  blockDocuments?: string[];
  blockWorkflows?: string[];
  blockHelpers?: string[];
};

export interface WorkflowOptions {
  visible?: boolean;
}

export interface WorkflowDecoratorOptions {
  token?: InjectionToken;
  options?: WorkflowOptions;
}

export const WORKFLOW_OPTIONS_KEY = 'workflow:options';

export function WithArguments<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target) => {
    (target as Constructor).argsSchema = schema;
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
    (target as Constructor).stateSchema = schema;
  };
}

export function WithResult<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target) => {
    validateStateSchema(schema);
    (target as Constructor).resultSchema = schema;
  };
}

function getTools(target: Constructor): string[] {
  const proto = target.prototype as object;
  const keys = (Reflect.getMetadata(TOOL_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

function getDocuments(target: Constructor): string[] {
  const proto = target.prototype as object;
  const keys = (Reflect.getMetadata(DOCUMENT_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

function getWorkflows(target: Constructor): string[] {
  const proto = target.prototype as object;
  const keys = (Reflect.getMetadata(WORKFLOW_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

function getHelpers(target: Constructor): string[] {
  const proto = target.prototype as object;
  const keys = (Reflect.getMetadata(TEMPLATE_HELPER_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

export function getWorkflowOptions(target: object, propertyKey: string | symbol): WorkflowOptions {
  return (
    (Reflect.getMetadata(WORKFLOW_OPTIONS_KEY, target, propertyKey) as WorkflowOptions | undefined) ?? {
      visible: true,
    }
  );
}

export function BlockConfig(options: BlockOptions): ClassDecorator {
  return (target) => {
    const ctor = target as Constructor;
    ctor.blockConfig = buildConfig(options);
    ctor.blockTools = getTools(ctor);
    ctor.blockDocuments = getDocuments(ctor);
    ctor.blockWorkflows = getWorkflows(ctor);
    ctor.blockHelpers = getHelpers(ctor);

    Reflect.defineMetadata(BLOCK_METADATA_KEY, options, target);
  };
}

export function Tool(token?: InjectionToken): PropertyDecorator & MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const type = token ?? (Reflect.getMetadata('design:type', target, propertyKey) as InjectionToken | undefined);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingTools = (Reflect.getMetadata(TOOL_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(TOOL_METADATA_KEY, [...existingTools, propertyKey], target);
  };
}

export function Document(token?: InjectionToken): PropertyDecorator & MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const type = token ?? (Reflect.getMetadata('design:type', target, propertyKey) as InjectionToken | undefined);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingDocuments =
      (Reflect.getMetadata(DOCUMENT_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(DOCUMENT_METADATA_KEY, [...existingDocuments, propertyKey], target);
  };
}

export function Workflow(options?: WorkflowDecoratorOptions): PropertyDecorator & MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const token = options?.token;
    const config: WorkflowOptions = {
      visible: true,
      ...options?.options,
    };

    const type = token ?? (Reflect.getMetadata('design:type', target, propertyKey) as InjectionToken | undefined);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingWorkflows =
      (Reflect.getMetadata(WORKFLOW_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(WORKFLOW_METADATA_KEY, [...existingWorkflows, propertyKey], target);

    Reflect.defineMetadata(WORKFLOW_OPTIONS_KEY, config, target, propertyKey);
  };
}

export function Helper(): MethodDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existing =
      (Reflect.getMetadata(TEMPLATE_HELPER_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(TEMPLATE_HELPER_METADATA_KEY, [...existing, propertyKey], target);
  };
}

export function Input(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existingInputs = (Reflect.getMetadata(INPUT_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(INPUT_METADATA_KEY, [...existingInputs, propertyKey], target);
  };
}

export function Output(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existingOutputs = (Reflect.getMetadata(OUTPUT_METADATA_KEY, target) as (string | symbol)[] | undefined) ?? [];
    Reflect.defineMetadata(OUTPUT_METADATA_KEY, [...existingOutputs, propertyKey], target);
  };
}
