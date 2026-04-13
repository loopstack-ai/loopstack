import { Injectable, Logger } from '@nestjs/common';
import {
  GuardMetadata,
  TransitionMetadata,
  WorkflowInterface,
  getGuardMetadata,
  getGuardMetadataMap,
  getTransitionMetadata,
} from '@loopstack/common';

/**
 * Resolves transitions for the new TypeScript-first workflow model.
 *
 * Reads transition metadata from decorators (@Initial, @Transition, @Final),
 * sorts by priority, and evaluates guards by calling methods on the proxy.
 *
 * Replaces StateMachineProcessorService for decorator-based workflows.
 */
@Injectable()
export class TransitionResolverService {
  private readonly logger = new Logger(TransitionResolverService.name);

  /**
   * Validates transition and guard metadata at startup.
   * Called once when the workflow is registered.
   */
  validate(target: object): void {
    const transitions = getTransitionMetadata(target);
    const guards = getGuardMetadata(target);

    // Must have exactly one @Initial transition
    const initialTransitions = transitions.filter((t) => t.from === 'start');
    if (initialTransitions.length === 0) {
      throw new Error(`Workflow ${target.constructor.name} has no @Initial transition.`);
    }
    if (initialTransitions.length > 1) {
      throw new Error(
        `Workflow ${target.constructor.name} has ${initialTransitions.length} @Initial transitions — exactly one is required.`,
      );
    }

    // Guard references must point to existing methods on the class
    const proto = Object.getPrototypeOf(target) as Record<string, unknown>;
    for (const guard of guards) {
      if (typeof proto[guard.guardMethodName] !== 'function') {
        throw new Error(
          `@Guard('${guard.guardMethodName}') on transition '${guard.transitionMethodName}' ` +
            `references a method that does not exist on ${target.constructor.name}.`,
        );
      }
    }

    // Multiple unguarded transitions from the same state → error
    const guardMap = getGuardMetadataMap(target);
    const byFrom = new Map<string, TransitionMetadata[]>();
    for (const t of transitions) {
      if (t.wait) continue; // wait transitions are manual, not auto-evaluated
      const list = byFrom.get(t.from) ?? [];
      list.push(t);
      byFrom.set(t.from, list);
    }

    for (const [from, group] of byFrom) {
      const unguarded = group.filter((t) => !guardMap.has(t.methodName));
      if (unguarded.length > 1) {
        const names = unguarded.map((t) => t.methodName).join(', ');
        throw new Error(
          `Workflow ${target.constructor.name} has ${unguarded.length} unguarded transitions ` +
            `from state '${from}': [${names}]. At most one unguarded transition per state is allowed.`,
        );
      }
    }
  }

  /**
   * Returns transitions available from the given state, sorted by priority
   * (highest first). Transitions without priority are sorted last.
   */
  getAvailableTransitions(target: object, currentPlace: string): TransitionMetadata[] {
    const allTransitions = getTransitionMetadata(target);

    return allTransitions
      .filter((t) => t.from === currentPlace)
      .sort((a, b) => {
        if (a.priority != null && b.priority != null) return b.priority - a.priority;
        if (a.priority != null) return -1;
        if (b.priority != null) return 1;
        return 0; // preserve declaration order
      });
  }

  /**
   * Evaluates auto-transitions (non-wait) from a given state and returns the
   * first one whose guard passes (or that has no guard).
   */
  resolveNextTransition(
    proxy: WorkflowInterface,
    transitions: TransitionMetadata[],
    guards: Map<string, GuardMetadata>,
  ): TransitionMetadata | undefined {
    const autoTransitions = transitions.filter((t) => !t.wait);

    for (const transition of autoTransitions) {
      const guard = guards.get(transition.methodName);

      if (guard) {
        const method = (proxy as Record<string, unknown>)[guard.guardMethodName];
        if (typeof method !== 'function') continue;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- proxy traps make method.call() return any
        const passes = (method as () => boolean).call(proxy);
        if (!passes) continue;
      }

      return transition;
    }

    return undefined;
  }
}
