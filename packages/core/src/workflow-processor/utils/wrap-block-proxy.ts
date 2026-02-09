import {
  BlockInterface,
  getBlockContextMetadata,
  getBlockInputMetadata,
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

      const value: unknown = Reflect.get(target, prop, receiver);
      // if (typeof value === 'function') {
      //   return value.bind(target) as unknown;
      // }
      return value;
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

      return Reflect.set(target, prop, value, receiver);
    },
  });
}
