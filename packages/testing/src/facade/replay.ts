import { Inject, Optional } from '@nestjs/common';
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

/** The current replay fixture format version. Older versions are rejected — re-record. */
export const FIXTURE_VERSION = 3 as const;

/**
 * One scripted tool response. Only `tool` and `envelope` are required — `workflow`,
 * `transition`, `args`, and `config` are assertion metadata: when present, the actual call
 * must match them, so a drifted call position, changed arguments, or changed config (e.g. a
 * system prompt) fails loudly instead of replaying a response that no longer fits.
 */
export interface ToolRecording {
  tool: string;
  workflow?: string;
  transition?: string;
  args?: unknown;
  config?: unknown;
  envelope: ToolEnvelope;
}

export interface ReplayFixture {
  version: typeof FIXTURE_VERSION;
  recordings: ToolRecording[];
}

/** Injection token under which `runWorkflow` provides the active `ReplaySource`. */
export const REPLAY_SOURCE = 'LOOPSTACK_REPLAY_SOURCE';

/**
 * Injection token under which `runWorkflow` provides the normalized mock boundary:
 * `'*'` (all tools consume the script) or a set of registered tool names.
 */
export const REPLAY_TOOLS = 'LOOPSTACK_REPLAY_TOOLS';

/** Recursively sorts object keys so semantically equal args serialize identically. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

/**
 * A strict, ordered script of tool responses. Every call inside the mock boundary consumes the
 * next entry — there is no matching or lookup. Each entry's metadata (`tool` always;
 * `workflow`/`transition`/`args`/`config` when present) is asserted against the actual call, so
 * any drift in call order, position, arguments, or config fails loudly with the exact position
 * named.
 */
export class ReplaySource {
  private cursor = 0;

  constructor(readonly fixture: ReplayFixture) {
    if ((fixture.version as number) !== FIXTURE_VERSION) {
      throw new Error(
        `Unsupported replay fixture version: ${String(fixture.version)}. Expected ${FIXTURE_VERSION} — ` +
          `v3 additionally asserts tool config (e.g. system prompts). Re-record via the fixture/record ` +
          `options or loopstack runs <run-id> --record, or bump a hand-written fixture to version: 3.`,
      );
    }
    const pendingIndex = fixture.recordings.findIndex((entry) => entry.envelope.pending);
    if (pendingIndex !== -1) {
      throw new Error(
        `Replay fixture entry #${pendingIndex + 1} (tool '${fixture.recordings[pendingIndex].tool}') carries a ` +
          `pending envelope — pending envelopes reference live sub-workflow machinery and cannot be replayed. ` +
          `Async tools must run live: leave them out of the replayTools boundary and re-record the fixture.`,
      );
    }
  }

  next(call: { workflow: string; transition: string; tool: string; args: unknown; config?: unknown }): ToolEnvelope {
    const position = this.cursor + 1;
    const where = `'${call.tool}' in ${call.workflow}.${call.transition}`;
    const entry = this.fixture.recordings[this.cursor];
    if (!entry) {
      throw new Error(
        `Replay script exhausted: call #${position} (${where}) has no scripted response — ` +
          `the workflow makes more calls than the fixture holds. Re-record the fixture.`,
      );
    }
    this.cursor++;

    if (entry.tool !== call.tool) {
      throw new Error(
        `Replay script mismatch at response #${position}: expected a call to '${entry.tool}'` +
          `${entry.workflow || entry.transition ? ` in ${entry.workflow ?? '?'}.${entry.transition ?? '?'}` : ''}, ` +
          `but got ${where} — the tool call order drifted. Re-record the fixture.`,
      );
    }
    if (entry.workflow !== undefined && entry.workflow !== call.workflow) {
      throw new Error(
        `Replay script mismatch at response #${position}: '${call.tool}' was recorded in workflow ` +
          `'${entry.workflow}' but called in '${call.workflow}' — the call position drifted. Re-record the fixture.`,
      );
    }
    if (entry.transition !== undefined && entry.transition !== call.transition) {
      throw new Error(
        `Replay script mismatch at response #${position}: '${call.tool}' was recorded in transition ` +
          `'${entry.transition}' but called in '${call.transition}' — the call position drifted. Re-record the fixture.`,
      );
    }
    if (entry.args !== undefined) {
      const recorded = JSON.stringify(canonicalize(entry.args));
      const actual = JSON.stringify(canonicalize(call.args));
      if (recorded !== actual) {
        throw new Error(
          `Replay drift at response #${position}: args for ${where} differ from the recording — ` +
            `the replayed response no longer fits.\n  recorded: ${recorded}\n  actual:   ${actual}\n` +
            `Delete the fixture file to re-record it on the next run ` +
            `(or re-derive it from a real run with loopstack runs <run-id> --record).`,
        );
      }
    }
    if (entry.config !== undefined) {
      const recorded = JSON.stringify(canonicalize(entry.config));
      const actual = JSON.stringify(canonicalize(call.config));
      if (recorded !== actual) {
        throw new Error(
          `Replay drift at response #${position}: config for ${where} differs from the recording — ` +
            `the replayed response no longer fits (e.g. a changed system prompt, model, or tool list).\n` +
            `  recorded: ${recorded}\n  actual:   ${actual}\n` +
            `Delete the fixture file to re-record it on the next run ` +
            `(or re-derive it from a real run with loopstack runs <run-id> --record).`,
        );
      }
    }
    return entry.envelope;
  }

  /** Fails when a completed run consumed fewer responses than the script holds. */
  assertFullyConsumed(): void {
    const leftover = this.fixture.recordings.length - this.cursor;
    if (leftover > 0) {
      const nextEntry = this.fixture.recordings[this.cursor];
      throw new Error(
        `Replay script has ${leftover} unconsumed response(s) — next would be '${nextEntry.tool}'` +
          `${nextEntry.workflow || nextEntry.transition ? ` in ${nextEntry.workflow ?? '?'}.${nextEntry.transition ?? '?'}` : ''}. ` +
          `The workflow makes fewer calls than the fixture holds. Re-record the fixture.`,
      );
    }
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
 * Tool interceptor that short-circuits tool execution with scripted envelopes. Registered by
 * `runWorkflow` when a `replay` source is passed; inactive (passes through) without one. Only
 * tools inside the mock boundary (`replayTools`) consume the script; all others run live.
 */
@UseToolInterceptor({ priority: 10 })
export class ReplayToolInterceptor implements ToolInterceptor {
  constructor(
    @Optional() @Inject(REPLAY_SOURCE) private readonly source: ReplaySource | undefined,
    @Optional() @Inject(REPLAY_TOOLS) private readonly boundary: '*' | Set<string> | undefined,
    private readonly executionScope: ExecutionScope,
  ) {}

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    if (!this.source) return next();

    const tool = getBlockName(context.tool as never);
    const boundary = this.boundary ?? '*';
    if (boundary !== '*' && !boundary.has(tool)) return next();

    const scope = this.executionScope.getOptional();
    if (!scope?.workflowName || !scope.transition?.id) {
      throw new Error(
        `Replaying tool '${tool}' outside an active workflow transition — ` +
          `no execution scope with workflowName and transition is set. This is a framework bug.`,
      );
    }

    return this.source.next({
      workflow: scope.workflowName,
      transition: scope.transition.id,
      tool,
      args: context.args,
      config: context.config,
    });
  }
}
