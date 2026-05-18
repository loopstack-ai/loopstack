import { z } from 'zod';
import { BlockConfigType } from '@loopstack/contracts/types';
import {
  BLOCK_CONFIG_METADATA_KEY,
  BLOCK_TYPE_METADATA_KEY,
  BlockOptions,
  BlockType,
  GUARDS_METADATA_KEY,
  GuardMetadata,
  INJECTED_DOCUMENTS_METADATA_KEY,
  INJECTED_TOOLS_METADATA_KEY,
  INJECTED_WORKFLOWS_METADATA_KEY,
  INJECT_TOOL_DEFAULTS_KEY,
  INJECT_WORKFLOW_DEFAULTS_KEY,
  PASS_THROUGH_METADATA_KEY,
  TRANSITIONS_METADATA_KEY,
  TransitionMetadata,
} from '../decorators/index.js';
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
 * Gets the args schema from the class decorator metadata (e.g., `@Tool({ schema })`, `@Workflow({ schema })`).
 */
export function getBlockArgsSchema(target: object | Constructor): z.ZodType | undefined {
  const ctor = getConstructor(target);
  const options = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions | undefined;
  return options?.schema;
}

/**
 * Gets the config schema from the class decorator metadata (e.g., `@Tool({ configSchema })`).
 */
export function getBlockConfigSchema(target: object | Constructor): z.ZodType | undefined {
  const ctor = getConstructor(target);
  const options = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions | undefined;
  return options?.configSchema;
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

// --- Transition metadata getters ---

/**
 * Gets all transition metadata from the class decorators
 */
export function getTransitionMetadata(target: object | Constructor): TransitionMetadata[] {
  const ctor = getConstructor(target);
  return (Reflect.getMetadata(TRANSITIONS_METADATA_KEY, ctor) as TransitionMetadata[]) ?? [];
}

/**
 * Gets all guard metadata from the class decorators
 */
export function getGuardMetadata(target: object | Constructor): GuardMetadata[] {
  const ctor = getConstructor(target);
  return (Reflect.getMetadata(GUARDS_METADATA_KEY, ctor) as GuardMetadata[]) ?? [];
}

/**
 * Gets guard metadata as a Map keyed by transition method name
 */
export function getGuardMetadataMap(target: object | Constructor): Map<string, GuardMetadata> {
  const guards = getGuardMetadata(target);
  const map = new Map<string, GuardMetadata>();
  for (const guard of guards) {
    map.set(guard.transitionMethodName, guard);
  }
  return map;
}

/**
 * Gets the block type from the decorator metadata
 */
export function getBlockTypeFromMetadata(target: object | Constructor): BlockType | undefined {
  const ctor = getConstructor(target);
  return Reflect.getMetadata(BLOCK_TYPE_METADATA_KEY, ctor) as BlockType | undefined;
}

/**
 * Gets the Zod schema from a @Document({ schema }) decorator.
 * Now delegates to getBlockArgsSchema since all block types store schema in BlockOptions.
 */
export function getDocumentSchema(target: object | Constructor): z.ZodType | undefined {
  return getBlockArgsSchema(target);
}

/**
 * Gets the list of @PassThrough() property names from the decorator metadata.
 */
export function getPassThroughProperties(target: object | Constructor): string[] {
  const proto = getPrototype(target);
  const keys = (Reflect.getMetadata(PASS_THROUGH_METADATA_KEY, proto) as (string | symbol)[] | undefined) ?? [];
  return keys.map((key) => String(key));
}

/**
 * Gets the @InjectTool(config) defaults for a specific property on a target.
 * Returns undefined if no defaults were set.
 */
export function getInjectToolDefaults(target: object, propertyName: string): Record<string, unknown> | undefined {
  const proto = getPrototype(target);
  const allDefaults = Reflect.getMetadata(INJECT_TOOL_DEFAULTS_KEY, proto) as
    | Record<string, Record<string, unknown>>
    | undefined;
  return allDefaults?.[propertyName];
}

/**
 * Resolves a tool by name, checking the parent first, then the workspace as fallback.
 */
export function resolveBlockTool<T = unknown>(parent: object, name: string, workspace?: object): T | undefined {
  return getBlockTool<T>(parent, name) ?? (workspace ? getBlockTool<T>(workspace, name) : undefined);
}

/**
 * Validates that all named tools are resolvable from the parent or workspace.
 * Throws with a descriptive error if any tool is missing.
 *
 * @param caller — name of the calling class (for error messages)
 * @param parent — the parent workflow or block instance
 * @param toolNames — tool property names that must be available
 * @param workspace — optional workspace fallback
 */
export function assertToolsAvailable(caller: string, parent: object, toolNames: string[], workspace?: object): void {
  for (const name of toolNames) {
    const tool = resolveBlockTool(parent, name, workspace);
    if (!tool) {
      throw new Error(
        `${caller} requires tool "${name}" but it was not found. ` +
          `Inject it on your workspace: @InjectTool() ${name}: <ToolClass>`,
      );
    }
  }
}

/**
 * Resolves @InjectTool(config) defaults by name, checking the parent first, then the workspace as fallback.
 */
export function resolveInjectToolDefaults(
  parent: object,
  propertyName: string,
  workspace?: object,
): Record<string, unknown> | undefined {
  return (
    getInjectToolDefaults(parent, propertyName) ??
    (workspace ? getInjectToolDefaults(workspace, propertyName) : undefined)
  );
}

/**
 * Gets the @InjectWorkflow(config) defaults for a specific property on a target.
 * Returns undefined if no defaults were set.
 */
export function getInjectWorkflowDefaults(target: object, propertyName: string): Record<string, unknown> | undefined {
  const proto = getPrototype(target);
  const allDefaults = Reflect.getMetadata(INJECT_WORKFLOW_DEFAULTS_KEY, proto) as
    | Record<string, Record<string, unknown>>
    | undefined;
  return allDefaults?.[propertyName];
}
