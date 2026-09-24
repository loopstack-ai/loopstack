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
 * Whether a run is most likely waiting on a **person** — what the "Needs input" badge reports.
 *
 * `waiting` on its own does not say who is being waited on: every run that parks without finishing carries
 * it, so a parent sitting on a child's callback looks exactly like a run holding an unanswered question.
 * What separates them is whether anything below is still working — a waiting run with no active children
 * has nobody left to wait for but you.
 *
 * It is a **proxy**, and deliberately a cheap one: it reads two fields already on the row. The exact answer
 * is `evaluateWorkflowPrompts` in `@loopstack/contracts` (what the CLI's inbox uses), which needs every
 * run's documents — far too much to fetch for a list. The proxy's known blind spot is a run parked between
 * automatic retries: nothing is running under it, but nobody is being asked anything either.
 */
export function needsInput(item: Pick<WorkflowItemInterface, 'status' | 'activeChildren'>): boolean {
  return item.status === WorkflowState.Waiting && item.activeChildren === 0;
}
