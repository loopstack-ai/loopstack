import { PROPERTY_DEPS_METADATA } from '@nestjs/common/constants';
import { BaseTool, getBlockTools, getPassThroughProperties } from '@loopstack/common';
import { ExecutionScope } from './execution-scope';

/**
 * Wraps a tool instance in a Proxy that provides:
 * - **call() interception** — routes through ToolExecutionService for validation and interceptors
 * - **state isolation** — `this.x` reads/writes go to the workflow's StateManager (namespaced by tool name),
 *   so tool state is per-workflow-instance and checkpointed across wait/resume
 * - **pass-through** for methods, @FrameworkService props (repository), and @InjectTool() nested tools
 *
 * This mirrors how wrapBlockProxy works for workflows — same StateManager, same checkpoint lifecycle.
 */
export function wrapToolProxy(
  tool: object,
  toolName: string,
  executionScope: ExecutionScope,
  executeCall: (
    rawTool: object,
    originalCallFn: (...callArgs: unknown[]) => unknown,
    args: Record<string, unknown>,
    proxy: object,
    options?: Record<string, unknown>,
  ) => Promise<unknown>,
): object {
  // Determine pass-through properties at creation time
  const passThroughProps = new Set<string | symbol>();

  // @PassThrough properties (repository, ctx)
  getPassThroughProperties(tool.constructor).forEach((name) => passThroughProps.add(name));

  // Nested @InjectTool() tools
  const nestedToolProps = new Set(getBlockTools(tool.constructor));
  nestedToolProps.forEach((name) => passThroughProps.add(name));

  // Methods from prototype chain (except call — we intercept that)
  let proto = Object.getPrototypeOf(tool) as Record<string, unknown> | null;
  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto).forEach((name) => {
      if (typeof (proto as Record<string, unknown>)[name] === 'function' && name !== 'call') {
        passThroughProps.add(name);
      }
    });
    proto = Object.getPrototypeOf(proto) as Record<string, unknown> | null;
  }

  // NestJS @Inject() property dependencies — pass-through to the raw instance
  const propertyDeps =
    (Reflect.getMetadata(PROPERTY_DEPS_METADATA, tool.constructor) as { key: string }[] | undefined) ?? [];
  propertyDeps.forEach((dep) => passThroughProps.add(dep.key));

  // Capture the original call() from the prototype chain — deliberately unbound; executeCall re-binds via .call(proxy)
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalCall: (...callArgs: unknown[]) => unknown = (tool as BaseTool).call;

  /* eslint-disable @typescript-eslint/no-unsafe-return --
     Proxy get/set handlers use `any` in TypeScript's ProxyHandler definition. */
  return new Proxy(tool, {
    get(target, prop, receiver) {
      // call() → route through framework (validation, interceptors)
      if (prop === 'call') {
        return (args?: Record<string, unknown>, options?: Record<string, unknown>) =>
          executeCall(target, originalCall, args ?? {}, receiver as object, options);
      }

      // Pass-through: methods, framework services, nested tools, NestJS-injected services
      if (passThroughProps.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }

      // State: read from workflow's StateManager via AsyncLocalStorage
      const ctx = executionScope.getOptional();
      if (!ctx) return Reflect.get(target, prop, receiver);

      const tools = ctx.getManager().getData('tools') as Record<string, Record<string, unknown>> | undefined;
      const stateValue = tools?.[toolName]?.[prop as string];

      // Fall back to raw instance value (class field initializers) if state hasn't been set yet
      if (stateValue === undefined) {
        return Reflect.get(target, prop, receiver);
      }
      return stateValue;
    },

    set(_target, prop, value) {
      // Protect pass-through properties
      if (passThroughProps.has(prop) || prop === 'call') {
        throw new Error(`Cannot reassign property "${String(prop)}"`);
      }

      // State: write to workflow's StateManager via AsyncLocalStorage
      const ctx = executionScope.get();
      const tools = (ctx.getManager().getData('tools') as Record<string, Record<string, unknown>>) ?? {};
      if (!tools[toolName]) tools[toolName] = {};
      tools[toolName][prop as string] = value;
      ctx.getManager().setData('tools' as never, tools as never);
      return true;
    },
  });
  /* eslint-enable @typescript-eslint/no-unsafe-return */
}
