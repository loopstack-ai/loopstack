import { PROPERTY_DEPS_METADATA } from '@nestjs/common/constants';
import {
  BlockInterface,
  WorkflowInterface,
  getBlockTools,
  getBlockWorkflows,
  getPassThroughProperties,
} from '@loopstack/common';
import { ExecutionContextManager } from './execution-context-manager';

/**
 * Wraps a workflow instance in a Proxy that intercepts property access
 * for **state management only**.
 *
 * Per-execution data (context, runtime, args) is passed via the `ctx`
 * parameter to transition methods — NOT through the proxy.
 *
 * Tools use `call()` (a real method on BaseTool) — no proxy redirect needed.
 *
 * The proxy handles:
 * - `this.<tool>`        → pass-through (tool proxy handles call() interception)
 * - `this.<wf>`          → pass-through (run() delegates to orchestrator.queue() via DI)
 * - `this.<method>`      → pass-through (prototype function)
 * - `this.repository`    → pass-through (NestJS @Inject)
 * - `this.render`        → pass-through (NestJS @Inject)
 * - `this.x`             → stateManager.get('x')
 * - `this.x = v`         → stateManager.set('x', v)
 *
 * Note: Workflow args are accessed via `ctx.args` (passed to transition methods),
 * NOT through `this.args`.
 */
export function wrapBlockProxy(instance: BlockInterface, ctxManager: ExecutionContextManager): WorkflowInterface {
  // Determine pass-through properties at creation time
  const passThroughProps = new Set<string | symbol>();

  // Collect injected tools, workflows
  const toolProps = new Set(getBlockTools(instance.constructor));
  const workflowProps = new Set(getBlockWorkflows(instance.constructor));

  toolProps.forEach((name) => passThroughProps.add(name));
  workflowProps.forEach((name) => passThroughProps.add(name));

  // @PassThrough properties (e.g. repository, ctx)
  getPassThroughProperties(instance.constructor).forEach((name) => passThroughProps.add(name));

  // NestJS @Inject() property dependencies
  const propertyDeps =
    (Reflect.getMetadata(PROPERTY_DEPS_METADATA, instance.constructor) as { key: string }[] | undefined) ?? [];
  propertyDeps.forEach((dep) => passThroughProps.add(dep.key));

  // Collect methods (from prototype chain)
  let proto = Object.getPrototypeOf(instance) as Record<string, unknown> | null;
  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto).forEach((name) => {
      if (typeof (proto as Record<string, unknown>)[name] === 'function') {
        passThroughProps.add(name);
      }
    });
    proto = Object.getPrototypeOf(proto) as Record<string, unknown> | null;
  }

  const stateManager = ctxManager.getManager();

  /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment --
     Proxy get/set handlers use `any` in TypeScript's ProxyHandler definition.
     All values are properly narrowed before return, but TS cannot track types through Proxy traps. */
  return new Proxy(instance as WorkflowInterface, {
    get(target, prop, receiver) {
      // Pass-through: functions, tools, workflows, templates, @Inject properties
      if (passThroughProps.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }

      // Everything else → StateManager (per-property)
      return stateManager.get(prop as string);
    },

    set(_target, prop, value) {
      // Protect pass-through properties (injected tools, workflows, services, methods, etc.)
      if (passThroughProps.has(prop)) {
        throw new Error(`Cannot reassign property "${String(prop)}"`);
      }

      // Everything else → StateManager
      stateManager.set(prop as string, value);
      return true;
    },
  });
  /* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
}
