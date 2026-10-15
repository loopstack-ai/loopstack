/**
 * A finite script of answers for one wait transition — consumed one per park, then exhausted.
 * Created with `queue()`.
 *
 * @public
 */
export class AnswerQueue {
  constructor(private readonly values: unknown[]) {}

  get exhausted(): boolean {
    return this.values.length === 0;
  }

  peek(): unknown {
    return this.values[0];
  }

  consume(): void {
    this.values.shift();
  }
}

/**
 * Script a finite sequence of HITL answers for a wait transition. Each time the run parks on the
 * transition, the next value is submitted; when the queue is exhausted the run parks for good —
 * which is how a cyclic workflow (a chat loop, for example) is driven a known number of turns:
 *
 * ```ts
 * const run = await runWorkflow(ChatWorkflow, {}, {
 *   answers: { userMessage: queue('Hello!', 'Thanks, bye') },
 * });
 * expect(run.status).toBe('waiting'); // parked again after two turns
 * ```
 *
 * A plain (non-queue) answer value is re-applied on every park instead.
 *
 * @public
 */
export function queue(...values: unknown[]): AnswerQueue {
  return new AnswerQueue([...values]);
}

/** Uniform view over plain (repeating) and queued (finite) scripted answers. */
export class ScriptedAnswers {
  constructor(private readonly answers: Record<string, unknown>) {}

  has(id: string): boolean {
    if (!(id in this.answers)) return false;
    const value = this.answers[id];
    return value instanceof AnswerQueue ? !value.exhausted : true;
  }

  peek(id: string): unknown {
    const value = this.answers[id];
    return value instanceof AnswerQueue ? value.peek() : value;
  }

  consume(id: string): void {
    const value = this.answers[id];
    if (value instanceof AnswerQueue) value.consume();
  }

  ids(): string[] {
    return Object.keys(this.answers);
  }
}

/**
 * A scripted failure answer: the callback a failed or canceled sub-workflow delivers instead of data.
 * Created with `failure()` or `unhandledFailure()`.
 */
export class FailureAnswer {
  constructor(
    readonly errorMessage?: string,
    readonly status: 'failed' | 'canceled' = 'failed',
    /** The parent declared no `onFailure`, so the run parks as failed instead of running a body. */
    readonly unhandled = false,
  ) {}
}

/**
 * Script a **failure** for the transition a parent declared as its `onFailure`: the body runs with a
 * {@link FailureInput}, exactly as it does when the real sub-workflow fails or is canceled.
 *
 * ```ts
 * const run = await runWorkflow(LandingWorkflow, args, {
 *   answers: { stopLanding: failure('the fork crashed') },
 * });
 * expect(run.place).toBe('end');
 * ```
 *
 * Composes with `queue()`: `queue({ ok: true }, failure('then the child dies'))`.
 *
 * @public
 */
export function failure(errorMessage?: string, status: 'failed' | 'canceled' = 'failed'): FailureAnswer {
  return new FailureAnswer(errorMessage, status);
}

/**
 * Script a failure for a parent that declared **no** `onFailure`: the run parks as failed at the place it
 * waits at, with the child's message, and no body runs. Name the `onSuccess` transition, which is the one
 * the framework delivers the unhandled failure to.
 *
 * ```ts
 * const run = await runWorkflow(TriageEntryWorkflow, args, {
 *   answers: { complete: unhandledFailure('the triage run crashed') },
 * });
 * expect(run.status).toBe('failed');
 * expect(run.place).toBe('triaging');
 * ```
 *
 * @public
 */
export function unhandledFailure(errorMessage?: string, status: 'failed' | 'canceled' = 'failed'): FailureAnswer {
  return new FailureAnswer(errorMessage, status, true);
}
