import { Inject, Optional } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  ToolEnvelope,
  ToolExecutionContext,
  ToolInterceptor,
  UseToolInterceptor,
  getBlockName,
} from '@loopstack/common';
import { ExecutionScope } from '@loopstack/core';
import { FIXTURE_VERSION, REPLAY_TOOLS, type ReplayFixture, type ToolRecording } from './replay.js';

/** Injection token under which `runWorkflow` provides the active `RecordSink`. */
export const RECORD_SINK = 'LOOPSTACK_RECORD_SINK';

/**
 * Collects tool responses during a live in-process run, in call order — the fixture is the
 * strict sequence a later replay consumes. `workflow`/`transition`/`args`/`config` are stored
 * as assertion metadata.
 */
export class RecordSink {
  private readonly recordings: ToolRecording[] = [];

  add(
    workflow: string,
    transition: string,
    tool: string,
    args: unknown,
    config: unknown,
    envelope: ToolEnvelope,
  ): void {
    this.recordings.push({
      tool,
      workflow,
      transition,
      ...(args !== undefined ? { args } : {}),
      ...(config !== undefined ? { config } : {}),
      envelope,
    });
  }

  toFixture(): ReplayFixture {
    return { version: FIXTURE_VERSION, recordings: [...this.recordings] };
  }

  writeTo(file: string): string {
    const target = resolve(file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(this.toFixture(), null, 2)}\n`);
    return target;
  }
}

/**
 * Tool interceptor that captures each live call's response in call order. Registered by
 * `runWorkflow` when the `record` option is set; inactive (passes through) without one. Only
 * tools inside the mock boundary (`replayTools`) are captured; a boundary tool returning a
 * pending envelope is an error — pending envelopes reference live sub-workflow machinery and
 * can never be replayed.
 */
@UseToolInterceptor({ priority: 10 })
export class RecordToolInterceptor implements ToolInterceptor {
  constructor(
    @Optional() @Inject(RECORD_SINK) private readonly sink: RecordSink | undefined,
    @Optional() @Inject(REPLAY_TOOLS) private readonly boundary: '*' | Set<string> | undefined,
    private readonly executionScope: ExecutionScope,
  ) {}

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    if (!this.sink) return next();

    const tool = getBlockName(context.tool as never);
    const boundary = this.boundary ?? '*';
    if (boundary !== '*' && !boundary.has(tool)) return next();

    const envelope = await next();

    if (envelope.pending) {
      throw new Error(
        `Tool '${tool}' returned a pending envelope and cannot be recorded for replay — async tools ` +
          `must always run live. Declare an explicit replayTools boundary that leaves '${tool}' out.`,
      );
    }

    const scope = this.executionScope.getOptional();
    if (!scope?.workflowName || !scope.transition?.id) {
      throw new Error(
        `Recording tool '${tool}' outside an active workflow transition — ` +
          `no execution scope with workflowName and transition is set. This is a framework bug.`,
      );
    }
    this.sink.add(scope.workflowName, scope.transition.id, tool, context.args, context.config, envelope);
    return envelope;
  }
}
