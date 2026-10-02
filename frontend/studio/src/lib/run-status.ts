import type { WorkflowItemInterface } from '@loopstack/contracts/api';
import { WorkflowState } from '@loopstack/contracts/enums';

/**
 * The badge classes for a run's state — one palette, used everywhere a run is listed.
 *
 * Tinted rather than solid so every state keeps its own hue: a run list where `running`, `pending` and
 * `canceled` share one colour says less than it could. Each carries its dark variant, following the house
 * pattern (`bg-*-100 … dark:bg-*-400/10`), because a badge that only works in light mode is a badge that
 * misreads half the time.
 */
export function getWorkflowStateColor(status: WorkflowState): string {
  switch (status) {
    case WorkflowState.Completed:
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-400/10 dark:text-green-400 dark:border-green-400/20';
    case WorkflowState.Waiting:
    case WorkflowState.Paused:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-400/10 dark:text-yellow-400 dark:border-yellow-400/20';
    case WorkflowState.Failed:
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-400/10 dark:text-red-400 dark:border-red-400/20';
    case WorkflowState.Running:
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20';
    case WorkflowState.Canceled:
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-400/10 dark:text-orange-400 dark:border-orange-400/20';
    case WorkflowState.Pending:
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Whether a run is waiting on a **person** — what the "Needs input" badge reports.
 *
 * `waiting` on its own does not say who is being waited on: every run that parks without finishing carries
 * it, so a parent sitting on a child's callback looks exactly like a run holding an unanswered question.
 * Two fields on the row separate them:
 *
 * - a transition marked `trigger: 'manual'` is one the engine declared `wait: true` and is holding for a
 *   submitted payload — somebody has to act. A run parked between automatic retries offers none, and so
 *   stops claiming to need you;
 * - no active children, because a run that can take input *while* its children work is not blocked on you.
 *   You may interject; nothing waits for it.
 *
 * It remains cheaper than the exact answer, `evaluateWorkflowPrompts` in `@loopstack/contracts/park-view`
 * (what the CLI's inbox uses), which needs every run's documents and widget configs. The difference shows
 * on a run parked with a manual transition but nothing renderable: the rules call that a bare wait, this
 * calls it waiting for you.
 */
export function needsInput(
  item: Pick<WorkflowItemInterface, 'status' | 'activeChildren' | 'availableTransitions'>,
): boolean {
  if (item.status !== WorkflowState.Waiting || item.activeChildren !== 0) return false;
  return (item.availableTransitions ?? []).some((transition) => transition.trigger === 'manual');
}

/**
 * The states a run has not finished in — what "a workspace is busy" is made of. `paused` is absent
 * because the engine never assigns it: a run that parks is `waiting`.
 */
export const ACTIVE_RUN_STATES: readonly WorkflowState[] = [
  WorkflowState.Running,
  WorkflowState.Waiting,
  WorkflowState.Pending,
];

/** What a single active run is doing, as the dashboard reports it. */
export type RunActivity = 'waiting' | 'working' | 'queued';

/**
 * Classifies one active run. `waiting` means waiting on a *person* ({@link needsInput}); a run parked on
 * its children is still `working`, because the machinery has not handed back yet — as is one parked
 * between automatic retries, which nobody is being asked about and the engine will pick up again.
 */
export function runActivity(
  item: Pick<WorkflowItemInterface, 'status' | 'activeChildren' | 'availableTransitions'>,
): RunActivity {
  if (needsInput(item)) return 'waiting';
  if (item.status === WorkflowState.Pending) return 'queued';
  return 'working';
}
