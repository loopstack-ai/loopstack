import { z } from 'zod';

/**
 * A workflow transition as the engine serializes it.
 *
 * This is a display/read shape, not an authoring format: transitions are declared
 * with the `@Transition` and `@Guard` decorators on workflow methods, and this
 * schema describes what the API returns for them — `WorkflowConfigDto.transitions`
 * and `WorkflowInterface.availableTransitions`.
 */
export const WorkflowTransitionSchema = z
  .object({
    id: z.string(),
    from: z.union([z.string(), z.array(z.string())]),
    to: z.string(),
    /** `manual` for wait transitions, `onEntry` for automatic ones. */
    trigger: z.enum(['manual', 'onEntry']).optional(),
    /** Name of the guard method gating the transition, from `@Guard('methodName')`. */
    guard: z.string().optional(),
  })
  .strict();
