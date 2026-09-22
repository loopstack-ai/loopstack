import { z } from 'zod';

/**
 * A workflow transition as the engine serializes it at runtime.
 *
 * This is a display/read shape, not an authoring format: transitions are declared
 * with the `@Transition` decorator on workflow methods, and this schema describes
 * what the engine reports as leaving the current place —
 * `WorkflowInterface.availableTransitions`.
 *
 * The declared graph is a different projection with an extra field; see
 * `WorkflowTransitionDefinitionSchema`.
 */
export const WorkflowTransitionSchema = z
  .object({
    id: z.string(),
    from: z.union([z.string(), z.array(z.string())]),
    to: z.string(),
    /** `manual` on wait transitions, absent on automatic ones. */
    trigger: z.literal('manual').optional(),
  })
  .strict();

/**
 * A workflow transition as the config endpoint serializes it — the declared graph
 * built from decorator metadata by `buildWorkflowTransitions`, backing
 * `WorkflowConfigDto.transitions`.
 *
 * It carries everything the runtime shape does plus the guard name, because the
 * declared edge is drawn whether or not the guard can currently fire, and it labels
 * automatic edges explicitly where the runtime shape just omits `trigger`.
 *
 * Mapping:
 *   - `wait: true`            → `trigger: 'manual'`
 *   - `wait: false|undefined` → `trigger: 'onEntry'`
 *   - `@Guard('canDoX')`      → `guard: 'canDoX'`
 */
export const WorkflowTransitionDefinitionSchema = WorkflowTransitionSchema.extend({
  /**
   * Restated wider than the runtime shape, which this `.extend()` overrides: the declared
   * graph labels an automatic edge `'onEntry'`, where the runtime list omits `trigger`.
   */
  trigger: z.enum(['manual', 'onEntry']).optional(),
  /** Name of the guard method gating the transition, from `@Guard('methodName')`. */
  guard: z.string().optional(),
});
