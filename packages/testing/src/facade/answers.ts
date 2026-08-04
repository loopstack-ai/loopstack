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
 * A scripted failure answer — delivers a failed/canceled sub-workflow callback instead of data.
 * Created with `failure()`.
 */
export class FailureAnswer {
  constructor(
    readonly errorMessage?: string,
    readonly status: 'failed' | 'canceled' = 'failed',
  ) {}
}

/**
 * Script a **failure** for a wait transition: the run receives a callback with
 * `status: 'failed'` (or `'canceled'`) instead of answer data — exactly what a crashed or
 * canceled sub-workflow delivers. This makes error handling reachable from ordinary tests:
 * a wait transition with `errorPlace`/`retryAttempts` routes accordingly; one without them
 * runs its body with `input.status === 'failed'` for inline handling.
 *
 * ```ts
 * const run = await runWorkflow(ProvisionWorkflow, args, {
 *   answers: { onProvisioned: failure('Provisioning crashed') },
 * });
 * expect(run.place).toBe('recovery');
 * ```
 *
 * Composes with `queue()`: `queue({ ok: true }, failure('then the child dies'))`.
 *
 * @public
 */
export function failure(errorMessage?: string, status: 'failed' | 'canceled' = 'failed'): FailureAnswer {
  return new FailureAnswer(errorMessage, status);
}
