import type { BaseApp, RunContext } from '@loopstack/common';

/** Properties intercepted by the app proxy — reads come from RunContext, not the instance. */
const CONTEXT_PROPERTIES = new Set<string | symbol>(['userId', 'workspaceId', 'environments']);

/**
 * Wraps an app instance in a read-only Proxy that provides execution context
 * properties (`userId`, `workspaceId`, `environments`) from the RunContext.
 *
 * All other property access (injected tools, workflows, methods) passes through
 * to the real app instance unchanged.
 *
 * The proxy is created once per workflow execution (in ExecutionContextManager)
 * and cached for the lifetime of that execution.
 */
export function wrapAppProxy(instance: object, context: RunContext): BaseApp {
  return new Proxy(instance as BaseApp, {
    get(target, prop, receiver) {
      if (prop === 'userId') return context.userId;
      if (prop === 'workspaceId') return context.workspaceId;
      if (prop === 'environments') return context.workspaceEnvironments ?? [];
      return Reflect.get(target, prop, receiver);
    },

    set(_target, prop) {
      if (CONTEXT_PROPERTIES.has(prop)) {
        throw new Error(`Cannot set read-only app context property "${String(prop)}"`);
      }
      throw new Error(`Cannot set property "${String(prop)}" on app proxy`);
    },
  });
}
