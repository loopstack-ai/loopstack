import type { WorkflowTransitionType } from '@loopstack/contracts/types';
import { getGuardMetadataMap, getTransitionMetadata } from './block-metadata.utils.js';

/**
 * Builds the serializable workflow transition list from a workflow's
 * decorator metadata (`@Initial`, `@Transition`, `@Final`, `@Guard`).
 *
 * The result matches `WorkflowTransitionConfigSchema` and is the shape
 * the frontend graph (and other consumers of `WorkflowConfigDto.transitions`)
 * expect.
 *
 * Mapping:
 *   - `methodName`           → `id`
 *   - `from`, `to`           → `from`, `to`
 *   - `wait: true`           → `trigger: 'manual'`
 *   - `wait: false|undefined`→ `trigger: 'onEntry'`
 *   - `@Guard('canDoX')`     → `if: '${{ canDoX() }}'` (TemplateExpression)
 */
export function buildWorkflowTransitions(target: object): WorkflowTransitionType[] {
  const transitions = getTransitionMetadata(target);
  const guards = getGuardMetadataMap(target);

  return transitions.map((t) => {
    const guard = guards.get(t.methodName);
    const result: WorkflowTransitionType = {
      id: t.methodName,
      from: t.from,
      to: t.to,
      trigger: t.wait ? 'manual' : 'onEntry',
    };
    if (guard) {
      result.if = `\${{ ${guard.guardMethodName}() }}`;
    }
    return result;
  });
}
