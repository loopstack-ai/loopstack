/**
 * Thrown by `BaseWorkflow.fail()` to end a run as failed while keeping what the transition did.
 *
 * The framework recognises this one class: it commits the transition's state, result and documents, records
 * `message` as the run's error and settles the run as failed. Every other error rolls the transition back.
 *
 * Authors never construct or catch it. A `try`/`catch` around the body of a transition must not swallow it,
 * so keep `fail()` outside the blocks that guard your own work.
 *
 * @public
 */
export class WorkflowFailure extends Error {
  readonly name = 'WorkflowFailure';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Whether an error is the signal `BaseWorkflow.fail()` throws.
 *
 * Matched by name rather than by class, so it still holds when the framework and the application resolve
 * different copies of this package.
 *
 * @public
 */
export function isWorkflowFailure(error: unknown): error is WorkflowFailure {
  return error instanceof Error && error.name === 'WorkflowFailure';
}
