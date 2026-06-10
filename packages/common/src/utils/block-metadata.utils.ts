import { z } from 'zod';
import { BlockConfigType } from '@loopstack/contracts/types';
import {
  BLOCK_CONFIG_METADATA_KEY,
  BLOCK_TYPE_METADATA_KEY,
  BlockOptions,
  BlockType,
  GUARDS_METADATA_KEY,
  GuardMetadata,
  TRANSITIONS_METADATA_KEY,
  TransitionMetadata,
} from '../decorators/index.js';
import { buildConfig } from './block-config.builder.js';
import { deriveWorkflowIdentifier } from './identifier.utils.js';

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
 * Gets the explicit name from the decorator metadata (e.g., `@Tool({ name: 'git_status' })`).
 * Falls back to the class/constructor name if no explicit name is set.
 */
export function getBlockName(target: object | Constructor): string {
  const ctor = getConstructor(target);
  const options = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions | undefined;
  return options?.name ?? ctor.name;
}

/**
 * Gets the workflow identifier: explicit `@Workflow({ name })` or auto-derived snake_case from class name.
 */
export function getWorkflowIdentifier(target: object | Constructor): string {
  const ctor = getConstructor(target);
  const options = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as BlockOptions | undefined;
  return options?.name ?? deriveWorkflowIdentifier(ctor.name);
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
 * Gets the state schema from a `@Workflow({ stateSchema })` decorator.
 * The schema is enforced by the workflow processor on each transition's resulting state.
 */
export function getWorkflowStateSchema(target: object | Constructor): z.ZodType | undefined {
  const ctor = getConstructor(target);
  const options = Reflect.getMetadata(BLOCK_CONFIG_METADATA_KEY, ctor) as
    | (BlockOptions & { stateSchema?: z.ZodType })
    | undefined;
  return options?.stateSchema;
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
