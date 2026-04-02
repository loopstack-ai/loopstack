import {
  BaseDocument,
  BaseTool,
  BaseWorkflow,
  BlockInterface,
  WorkflowInterface,
  getBlockDocuments,
  getBlockInputMetadata,
  getBlockTemplatesPropertyName,
  getBlockTools,
  getBlockWorkflows,
} from '@loopstack/common';
import { ExecutionContextManager } from './execution-context-manager';

/** Union of injected block types that support method redirection */
type InjectableBlock = BaseTool | BaseDocument | BaseWorkflow;

/**
 * Wraps a workflow instance in a Proxy that intercepts property access:
 *
 * - `this.runtime`  → ctxManager.getData()   (WorkflowMetadataInterface)
 * - `this.context`  → ctxManager.getContext() (RunContext)
 * - `this.args`     → ctxManager.getArgs()   (@Input validated args)
 * - `this.templates` → pass-through (native class property)
 * - `this.<tool>`   → pass-through + method redirect (.run() → ._run())
 * - `this.<doc>`    → pass-through + method redirect (.create() → ._create())
 * - `this.<wf>`     → pass-through + method redirect (.run() → ._run())
 * - `this.<method>` → pass-through (prototype function)
 * - `this.x`        → stateManager.get('x')
 * - `this.x = v`    → stateManager.set('x', v)
 */
export function wrapBlockProxy(instance: BlockInterface, ctxManager: ExecutionContextManager): WorkflowInterface {
  // Determine pass-through properties at creation time
  const passThroughProps = new Set<string | symbol>();

  // Collect injected tools, documents, workflows
  const toolProps = new Set(getBlockTools(instance.constructor));
  const documentProps = new Set(getBlockDocuments(instance.constructor));
  const workflowProps = new Set(getBlockWorkflows(instance.constructor));

  toolProps.forEach((name) => passThroughProps.add(name));
  documentProps.forEach((name) => passThroughProps.add(name));
  workflowProps.forEach((name) => passThroughProps.add(name));

  // @InjectTemplates property
  const templatesProperty = getBlockTemplatesPropertyName(instance.constructor);
  if (templatesProperty) {
    passThroughProps.add(templatesProperty);
  }

  // @Input property
  const inputMeta = getBlockInputMetadata(instance.constructor);
  if (inputMeta) {
    passThroughProps.add(inputMeta.name);
  }

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
      // Fixed proxy properties — read from ExecutionContextManager
      if (prop === 'runtime') return ctxManager.getData();
      if (prop === 'context') return ctxManager.getContext();
      if (prop === 'args') return ctxManager.getArgs();

      // Pass-through: functions, templates, @Input
      if (passThroughProps.has(prop)) {
        const value = Reflect.get(target, prop, receiver);

        // Wrap injected tools/documents/workflows with method redirect proxy
        if (
          (toolProps.has(prop as string) || workflowProps.has(prop as string) || documentProps.has(prop as string)) &&
          value != null &&
          typeof value === 'object'
        ) {
          return new Proxy(value as InjectableBlock, {
            get(t, p, r) {
              if (p === 'run' && '_run' in t && typeof t._run === 'function') {
                return (t._run as (...args: unknown[]) => unknown).bind(t);
              }
              if (p === 'create' && '_create' in t && typeof (t as BaseDocument)._create === 'function') {
                return ((t as BaseDocument)._create as (...args: unknown[]) => unknown).bind(t);
              }
              return Reflect.get(t, p, r);
            },
          });
        }

        return value as unknown;
      }

      // Everything else → StateManager (per-property)
      return stateManager.get(prop as string);
    },

    set(_target, prop, value) {
      // Protect fixed properties
      if (prop === 'runtime' || prop === 'context' || prop === 'args') {
        throw new Error(`Cannot modify "${String(prop)}"`);
      }

      // Protect injected instances
      if (passThroughProps.has(prop)) {
        throw new Error(`Cannot reassign injected property "${String(prop)}"`);
      }

      // Everything else → StateManager
      stateManager.set(prop as string, value);
      return true;
    },
  });
  /* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
}
