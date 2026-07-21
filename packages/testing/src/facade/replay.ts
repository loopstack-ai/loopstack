import { Inject, Logger, Optional } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ToolEnvelope,
  ToolExecutionContext,
  ToolInterceptor,
  UseToolInterceptor,
  getBlockName,
} from '@loopstack/common';
import { ExecutionScope } from '@loopstack/core';

/**
 * One recorded tool response. `transition` is the transition method the call happened in,
 * `seq` its order within that transition, `tool` the tool's registered name.
 */
export interface ToolRecording {
  transition: string;
  seq: number;
  tool: string;
  args?: unknown;
  envelope: ToolEnvelope;
}

export interface ReplayFixture {
  version: 1;
  recordings: ToolRecording[];
}

/** Injection token under which `runWorkflow` provides the active `ReplaySource`. */
export const REPLAY_SOURCE = 'LOOPSTACK_REPLAY_SOURCE';

/**
 * Replays recorded tool responses in order, keyed by (transition, tool). Tools that were never
 * recorded for a transition run live; an exhausted recording list is an error — a replayed test
 * must not silently fall through to a live provider mid-transition.
 */
export class ReplaySource {
  private readonly byKey = new Map<string, ToolRecording[]>();
  private readonly cursors = new Map<string, number>();

  constructor(readonly fixture: ReplayFixture) {
    for (const recording of [...fixture.recordings].sort((a, b) => a.seq - b.seq)) {
      const key = `${recording.transition}::${recording.tool}`;
      const list = this.byKey.get(key) ?? [];
      list.push(recording);
      this.byKey.set(key, list);
    }
  }

  has(transition: string, tool: string): boolean {
    return this.byKey.has(`${transition}::${tool}`);
  }

  next(transition: string, tool: string): ToolRecording {
    const key = `${transition}::${tool}`;
    const list = this.byKey.get(key);
    if (!list) {
      throw new Error(`No recordings for tool '${tool}' in transition '${transition}'.`);
    }
    const cursor = this.cursors.get(key) ?? 0;
    if (cursor >= list.length) {
      throw new Error(
        `Recordings for tool '${tool}' in transition '${transition}' exhausted after ${list.length} call(s) — ` +
          `the workflow makes more calls than the fixture holds. Re-record the fixture.`,
      );
    }
    this.cursors.set(key, cursor + 1);
    return list[cursor];
  }
}

/**
 * Load a replay fixture — from a JSON file path or an inline fixture object.
 *
 * ```ts
 * const run = await runWorkflow(TriageWorkflow, { ticket }, {
 *   replay: replay('__recordings__/triage.json'),
 * });
 * ```
 *
 * @public
 */
export function replay(source: string | ReplayFixture): ReplaySource {
  const fixture: ReplayFixture =
    typeof source === 'string' ? (JSON.parse(readFileSync(resolve(source), 'utf8')) as ReplayFixture) : source;
  return new ReplaySource(fixture);
}

/**
 * Tool interceptor that short-circuits tool execution with recorded envelopes. Registered by
 * `runWorkflow` when a `replay` source is passed; inactive (passes through) without one.
 * Matching is transition-scoped (D4): recordings are keyed by the executing transition, then
 * consumed in sequence. A drift warning is logged when the outgoing args differ from the recording.
 */
@UseToolInterceptor({ priority: 10 })
export class ReplayToolInterceptor implements ToolInterceptor {
  private readonly logger = new Logger(ReplayToolInterceptor.name);

  constructor(
    @Optional() @Inject(REPLAY_SOURCE) private readonly source: ReplaySource | undefined,
    private readonly executionScope: ExecutionScope,
  ) {}

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    if (!this.source) return next();

    const transition = this.executionScope.getOptional()?.transition?.id ?? '';
    const tool = getBlockName(context.tool as never);

    if (!this.source.has(transition, tool)) {
      return next();
    }

    const recording = this.source.next(transition, tool);
    if (recording.args !== undefined && JSON.stringify(recording.args) !== JSON.stringify(context.args)) {
      this.logger.warn(
        `Replay drift: args for tool '${tool}' in transition '${transition}' (seq ${recording.seq}) ` +
          `differ from the recording. The replayed response may no longer fit — consider re-recording.`,
      );
    }
    return recording.envelope;
  }
}
