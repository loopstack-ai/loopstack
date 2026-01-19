import { Inject } from '@nestjs/common';
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

export interface WorkflowOptions {
  visible?: boolean;
}

export interface WorkflowDecoratorOptions {
  token?: any;
  options?: WorkflowOptions;
}

export const WORKFLOW_OPTIONS_KEY = 'workflow:options';

export function WithArguments<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target: any) => {
    target.argsSchema = schema;
  };
}

function validateStateSchema(schema: z.ZodType): void {
  const forbiddenKeys = ['args', 'metadata'];

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const keys = Object.keys(shape);

    for (const key of forbiddenKeys) {
      if (keys.includes(key)) {
        throw new Error(`State schema cannot contain '${key}' key`);
      }
    }
  }
}

export function WithState<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target: any) => {
    validateStateSchema(schema);
    target.stateSchema = schema;
  };
}

export function WithResult<T extends z.ZodType>(schema: T): ClassDecorator {
  return (target: any) => {
    validateStateSchema(schema);
    target.resultSchema = schema;
  };
}

function getTools(target: any): string[] {
  const keys: (string | symbol)[] = Reflect.getMetadata(TOOL_METADATA_KEY, target.prototype) || [];
  return keys.map((key) => String(key));
}

function getDocuments(target: any): string[] {
  const keys: (string | symbol)[] = Reflect.getMetadata(DOCUMENT_METADATA_KEY, target.prototype) || [];
  return keys.map((key) => String(key));
}

function getWorkflows(target: any): string[] {
  const keys: (string | symbol)[] = Reflect.getMetadata(WORKFLOW_METADATA_KEY, target.prototype) || [];
  return keys.map((key) => String(key));
}

function getHelpers(target: any): string[] {
  const keys: (string | symbol)[] = Reflect.getMetadata(TEMPLATE_HELPER_METADATA_KEY, target.prototype) || [];
  return keys.map((key) => String(key));
}

export function getWorkflowOptions(target: any, propertyKey: string | symbol): WorkflowOptions {
  return Reflect.getMetadata(WORKFLOW_OPTIONS_KEY, target, propertyKey) ?? { visible: true };
}

export function BlockConfig(options: BlockOptions): ClassDecorator {
  return (target: any) => {
    target.blockConfig = buildConfig(options);
    target.blockTools = getTools(target);
    target.blockDocuments = getDocuments(target);
    target.blockWorkflows = getWorkflows(target);
    target.blockHelpers = getHelpers(target);

    Reflect.defineMetadata(BLOCK_METADATA_KEY, options, target);
  };
}

export function Tool(token?: any): PropertyDecorator & MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const type = token ?? Reflect.getMetadata('design:type', target, propertyKey);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingTools = Reflect.getMetadata(TOOL_METADATA_KEY, target) || [];
    Reflect.defineMetadata(TOOL_METADATA_KEY, [...existingTools, propertyKey], target);
  };
}

export function Document(token?: any): PropertyDecorator & MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const type = token ?? Reflect.getMetadata('design:type', target, propertyKey);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingTools = Reflect.getMetadata(DOCUMENT_METADATA_KEY, target) || [];
    Reflect.defineMetadata(DOCUMENT_METADATA_KEY, [...existingTools, propertyKey], target);
  };
}

export function Workflow(options?: WorkflowDecoratorOptions): PropertyDecorator & MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const token = options?.token;
    const config: WorkflowOptions = {
      visible: true,
      ...options?.options,
    };

    const type = token ?? Reflect.getMetadata('design:type', target, propertyKey);

    if (type) {
      Inject(type)(target, propertyKey);
    }

    const existingWorkflows = Reflect.getMetadata(WORKFLOW_METADATA_KEY, target) || [];
    Reflect.defineMetadata(WORKFLOW_METADATA_KEY, [...existingWorkflows, propertyKey], target);

    Reflect.defineMetadata(WORKFLOW_OPTIONS_KEY, config, target, propertyKey);
  };
}

export function Helper(): MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existing = Reflect.getMetadata(TEMPLATE_HELPER_METADATA_KEY, target) || [];
    Reflect.defineMetadata(TEMPLATE_HELPER_METADATA_KEY, [...existing, propertyKey], target);
  };
}

export function Input(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingInputs = Reflect.getMetadata(INPUT_METADATA_KEY, target) || [];
    Reflect.defineMetadata(INPUT_METADATA_KEY, [...existingInputs, propertyKey], target);
  };
}

export function Output(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingOutputs = Reflect.getMetadata(OUTPUT_METADATA_KEY, target) || [];
    Reflect.defineMetadata(OUTPUT_METADATA_KEY, [...existingOutputs, propertyKey], target);
  };
}
