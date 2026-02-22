import {
  BlockInterface,
  ToolInterface,
  getBlockContextMetadata,
  getBlockInputMetadata,
  getBlockRuntimeMetadata,
  getBlockSharedProperties,
  getBlockStateMetadata,
} from '@loopstack/common';
import { ExecutionContextManager } from './execution-context-manager';

export function wrapBlockProxy<TInput = any, TState = any>(
  instance: BlockInterface,
  runtimeContext: ExecutionContextManager<TInput, TState>,
) {
  const stateMeta = getBlockStateMetadata(instance.constructor);
  const argsMeta = getBlockInputMetadata(instance.constructor);
  const contextMeta = getBlockContextMetadata(instance.constructor);
  const runtimeMeta = getBlockRuntimeMetadata(instance.constructor);
  const sharedProps = new Set(getBlockSharedProperties(instance));

  return new Proxy(instance, {
    get(target, prop, receiver) {
      // Intercept args access
      if (prop === argsMeta?.name) {
        return runtimeContext.getArgs();
      }

      // Intercept state access
      if (prop === stateMeta?.name) {
        return runtimeContext.getState();
      }

      // Intercept context access
      if (prop === contextMeta?.name) {
        return runtimeContext.getContext();
      }

      // Intercept runtime access
      if (prop === runtimeMeta?.name) {
        return runtimeContext.getData();
      }

      return Reflect.get(target, prop, receiver) as unknown;
    },

    set(target, prop, value: TState, receiver) {
      if (prop === stateMeta?.name) {
        runtimeContext.setState(value);
        return true;
      }

      if (prop === contextMeta?.name) {
        throw new Error('Cannot modify workflow context');
      }

      if (prop === argsMeta?.name) {
        throw new Error('Cannot modify workflow arguments');
      }

      if (prop === runtimeMeta?.name) {
        throw new Error('Cannot modify workflow runtime');
      }

      // Allow writes to @Shared() properties
      if (sharedProps.has(prop)) {
        return Reflect.set(target, prop, value, receiver);
      }

      throw new Error(
        `Cannot set property "${String(prop)}" on block during execution. ` +
          `Use @State() for per-execution data or @Shared() for intentionally shared singleton data.`,
      );
    },
  });
}

export function wrapToolProxy(instance: ToolInterface): ToolInterface {
  const sharedProps = new Set(getBlockSharedProperties(instance));

  return new Proxy(instance, {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver) as unknown;
    },

    set(target, prop, value, receiver) {
      if (sharedProps.has(prop)) {
        return Reflect.set(target, prop, value, receiver);
      }

      throw new Error(
        `Cannot set property "${String(prop)}" on tool during execution. ` +
          `Use @Shared() to mark properties that are intentionally shared across executions.`,
      );
    },
  });
}
