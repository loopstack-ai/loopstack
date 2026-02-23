import { z } from 'zod';
import { BlockConfigType } from '@loopstack/contracts/dist/types';
import {
  BLOCK_CONFIG_METADATA_KEY,
  BlockOptions,
  CONTEXT_METADATA_KEY,
  ContextMetadata,
  INJECTED_DOCUMENTS_METADATA_KEY,
  INJECTED_TOOLS_METADATA_KEY,
  INJECTED_WORKFLOWS_METADATA_KEY,
  INPUT_METADATA_KEY,
  InputMetadata,
  OUTPUT_METADATA_KEY,
  OutputMetadata,
  RUNTIME_METADATA_KEY,
  RuntimeMetadata,
  SHARED_METADATA_KEY,
  STATE_METADATA_KEY,
  StateMetadata,
  TEMPLATE_HELPER_METADATA_KEY,
} from '../decorators';
import { buildConfig } from './block-config.builder.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type Constructor = Function & {
  prototype: object;
};

/**
 * Gets the constructor from either an instance or a class
 */
function getConstructor(target: object | Constructor): Constructor {
  if (typeof target === 'function') {
    return target;
  }
  return target.constructor as Constructor;
}

/**
 * Gets the prototype from either an instance or a class
 */
function getPrototype(target: object | Constructor): object {
  if (typeof target === 'function') {
    return target.prototype as object;
  }
  return Object.getPrototypeOf(target) as object;
}

/**
 * Gets the block configuration from the decorator metadata
 */
export function getBlockConfig<T = BlockConfigType>(target: object | Constructor): T | undefined {
  const ctor = getConstructor(target);
  const options = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions | undefined;
  return options ? (buildConfig(options) as T) : undefined;
}

/**
 * Gets the block options from the decorator metadata
 */
export function getBlockOptions(target: object | Constructor): BlockOptions | undefined {
  const ctor = getConstructor(target);
  return Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions | undefined;
}

/**
 * Gets the list of tool property names from the decorator metadata
 */
export function getBlockTools(target: object | Constructor): string[] {
  const proto = getPrototype(target);
  const keys = (Reflect.getMetadata(INJECTED_TOOLS_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

/**
 * Gets the list of document property names from the decorator metadata
 */
export function getBlockDocuments(target: object | Constructor): string[] {
  const proto = getPrototype(target);
  const keys = (Reflect.getMetadata(INJECTED_DOCUMENTS_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

/**
 * Gets the list of workflow property names from the decorator metadata
 */
export function getBlockWorkflows(target: object | Constructor): string[] {
  const proto = getPrototype(target);
  const keys = (Reflect.getMetadata(INJECTED_WORKFLOWS_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

/**
 * Gets the list of template helper method names from the decorator metadata
 */
export function getBlockHelpers(target: object | Constructor): string[] {
  const proto = getPrototype(target);
  const keys = (Reflect.getMetadata(TEMPLATE_HELPER_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

/**
 * Gets the list of shared property names from the decorator metadata
 */
export function getBlockSharedProperties(target: object | Constructor): (string | symbol)[] {
  const ctor = getConstructor(target);
  return (Reflect.getMetadata(SHARED_METADATA_KEY, ctor) as (string | symbol)[] | undefined) ?? [];
}

/**
 * Gets the full input metadata from the decorator
 */
export function getBlockInputMetadata(target: object | Constructor): InputMetadata | undefined {
  const ctor = getConstructor(target);
  return Reflect.getMetadata(INPUT_METADATA_KEY, ctor) as InputMetadata | undefined;
}

/**
 * Gets the full context metadata from the decorator
 */
export function getBlockContextMetadata(target: object | Constructor): ContextMetadata | undefined {
  const ctor = getConstructor(target);
  return Reflect.getMetadata(CONTEXT_METADATA_KEY, ctor) as ContextMetadata | undefined;
}

/**
 * Gets the full runtime metadata from the decorator
 */
export function getBlockRuntimeMetadata(target: object | Constructor): RuntimeMetadata | undefined {
  const ctor = getConstructor(target);
  return Reflect.getMetadata(RUNTIME_METADATA_KEY, ctor) as RuntimeMetadata | undefined;
}

/**
 * Gets the args schema from the decorator metadata
 */
export function getBlockArgsSchema(target: object | Constructor): z.ZodType | undefined {
  return getBlockInputMetadata(target)?.schema;
}

/**
 * Gets the full state metadata from the decorator
 */
export function getBlockStateMetadata(target: object | Constructor): StateMetadata | undefined {
  const ctor = getConstructor(target);
  return Reflect.getMetadata(STATE_METADATA_KEY, ctor) as StateMetadata | undefined;
}

/**
 * Gets the state schema from the decorator metadata
 */
export function getBlockStateSchema(target: object | Constructor): z.ZodType | undefined {
  return getBlockStateMetadata(target)?.schema;
}

/**
 * Gets the full output metadata from the decorator
 */
export function getBlockOutputMetadata(target: object | Constructor): OutputMetadata | undefined {
  const ctor = getConstructor(target);
  return Reflect.getMetadata(OUTPUT_METADATA_KEY, ctor) as OutputMetadata | undefined;
}

/**
 * Gets the result schema from the decorator metadata
 */
export function getBlockResultSchema(target: object | Constructor): z.ZodType | undefined {
  return getBlockOutputMetadata(target)?.schema;
}

/**
 * Gets a workflow instance by name from a block
 */
export function getBlockWorkflow<T = unknown>(target: object, name: string): T | undefined {
  const workflows = getBlockWorkflows(target);
  return workflows.includes(name) ? ((target as Record<string, unknown>)[name] as T) : undefined;
}

/**
 * Gets a tool instance by name from a block
 */
export function getBlockTool<T = unknown>(target: object, name: string): T | undefined {
  const tools = getBlockTools(target);
  return tools.includes(name) ? ((target as Record<string, unknown>)[name] as T) : undefined;
}

/**
 * Gets a document instance by name from a block
 */
export function getBlockDocument<T = unknown>(target: object, name: string): T | undefined {
  const documents = getBlockDocuments(target);
  return documents.includes(name) ? ((target as Record<string, unknown>)[name] as T) : undefined;
}

/**
 * Gets a helper function by name from a block
 */
export function getBlockHelper(target: object, name: string): ((...args: unknown[]) => unknown) | undefined {
  const helpers = getBlockHelpers(target);
  return helpers.includes(name)
    ? ((target as Record<string, unknown>)[name] as (...args: unknown[]) => unknown)
    : undefined;
}

export interface TemplateHelper {
  name: string;
  fn: (...args: unknown[]) => unknown;
}

export function getBlockTemplateHelpers(target: object): TemplateHelper[] {
  const proto = getPrototype(target);
  const keys = (Reflect.getMetadata(TEMPLATE_HELPER_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  const targetRecord = target as Record<string, unknown>;

  const helpers: TemplateHelper[] = [];
  for (const key of keys) {
    const name = String(key);
    const fn = targetRecord[name];
    if (typeof fn === 'function') {
      helpers.push({ name, fn: fn as (...args: unknown[]) => unknown });
    }
  }
  return helpers;
}
