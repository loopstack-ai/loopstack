import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BaseTool, BaseWorkflow, Tool, ToolCallOptions, ToolEnvelope, Transition, Workflow } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { replay, runWorkflow } from '@loopstack/testing';
import { CustomToolExampleWorkflow } from '../custom-tool-example.workflow';
import { MathService } from '../services/math.service';
import { CounterTool, MathSumTool } from '../tools';

describe('CustomToolExampleWorkflow — runWorkflow facade', () => {
  it('runs live tools, answers the wait transition, and completes', async () => {
    const run = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: [CounterTool, MathSumTool, MathService],
        answers: { userContinue: {} },
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['calculate', 'userContinue', 'continueCount']);
    expect(run.result).toEqual({ total: 5 });

    // The trace carries the run's full story: every tool call with its envelope, the park
    // settle with what the run waited on, and the documents each transition emitted.
    expect(run.toolCalls.map((c) => c.toolName)).toEqual([
      'math_sum',
      'counter',
      'counter',
      'counter',
      'counter',
      'counter',
      'counter',
    ]);
    expect(run.toolCalls[0]).toMatchObject({ type: 'tool.completed', args: { a: 2, b: 3 }, envelope: { data: 5 } });
    expect(run.trace).toContainEqual(
      expect.objectContaining({ type: 'run.settled', status: 'waiting', availableTransitions: ['userContinue'] }),
    );
    expect(run.trace.filter((e) => e.type === 'document.emitted').length).toBeGreaterThan(0);
  });

  it('replays the scripted tool responses strictly in sequence', async () => {
    const run = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: [CounterTool, MathSumTool, MathService],
        answers: { userContinue: {} },
        replay: replay({
          version: 3,
          recordings: [
            // The strict response sequence, in call order; transition names are assertions.
            { tool: 'math_sum', transition: 'calculate', args: { a: 2, b: 3 }, envelope: { data: 999 } },
            { tool: 'counter', transition: 'calculate', envelope: { data: 101 } },
            { tool: 'counter', transition: 'calculate', envelope: { data: 102 } },
            { tool: 'counter', transition: 'calculate', envelope: { data: 103 } },
            { tool: 'counter', transition: 'continueCount', envelope: { data: 104 } },
            { tool: 'counter', transition: 'continueCount', envelope: { data: 105 } },
            { tool: 'counter', transition: 'continueCount', envelope: { data: 106 } },
          ],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    // The replayed math_sum envelope (999) replaced the live 2+3 result
    expect(run.result).toEqual({ total: 999 });

    // The replayed counter sequence is transition-scoped: 101-103 before the wait, 104-106 after
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts.some((t) => t.includes('Counter before pause: 101, 102, 103'))).toBe(true);
    expect(texts.some((t) => t.includes('Counter after resume: 104, 105, 106'))).toBe(true);
  });
});

// --- Fixture v3: config capture and drift detection ---------------------------------------

const PrefixConfigSchema = z.object({ prefix: z.string() });
type PrefixConfig = z.infer<typeof PrefixConfigSchema>;

@Tool({
  name: 'prefixer',
  schema: z.object({ word: z.string() }),
  configSchema: PrefixConfigSchema,
  resultSchema: z.string(),
})
class PrefixerTool extends BaseTool<{ word: string }, PrefixConfig, string> {
  protected async handle(
    args: { word: string },
    _ctx: RunContext,
    options?: ToolCallOptions<PrefixConfig>,
  ): Promise<ToolEnvelope<string>> {
    return Promise.resolve({ data: `${options?.config?.prefix ?? ''}${args.word}` });
  }
}

// The config the workflow sends — mutated between record and replay to simulate a prompt change.
let currentPrefix = 'hello-';

@Workflow({ title: 'Config Replay Probe' })
class ConfigReplayWorkflow extends BaseWorkflow {
  constructor(private readonly prefixer: PrefixerTool) {
    super();
  }

  @Transition({ to: 'end' })
  async greet() {
    const result = await this.prefixer.call({ word: 'world' }, { config: { prefix: currentPrefix } });
    this.setResult({ message: result.data });
  }
}

describe('fixture v3 — config capture and drift', () => {
  it('records config, replays to the identical result, and fails on config drift', async () => {
    currentPrefix = 'hello-';
    const recorded = await runWorkflow(ConfigReplayWorkflow, undefined, {
      providers: [PrefixerTool],
      record: true,
    });

    expect(recorded.status).toBe('completed');
    expect(recorded.result).toEqual({ message: 'hello-world' });
    expect(recorded.recordings?.version).toBe(3);
    expect(recorded.recordings?.recordings[0]).toMatchObject({
      tool: 'prefixer',
      args: { word: 'world' },
      config: { prefix: 'hello-' },
    });

    // Same config → the fixture replays to the identical result.
    const replayed = await runWorkflow(ConfigReplayWorkflow, undefined, {
      providers: [PrefixerTool],
      replay: replay(recorded.recordings!),
    });
    expect(replayed.status).toBe('completed');
    expect(replayed.result).toEqual({ message: 'hello-world' });

    // Changed config — the drift the feature exists to catch: the run fails naming the config.
    currentPrefix = 'changed-';
    const drifted = await runWorkflow(ConfigReplayWorkflow, undefined, {
      providers: [PrefixerTool],
      replay: replay(recorded.recordings!),
    });
    expect(drifted.status).toBe('failed');
    expect(drifted.error).toMatch(/config for 'prefixer'/);
    expect(drifted.error).toContain('hello-');
    expect(drifted.error).toContain('changed-');
  });

  it('rejects version 2 fixtures outright', () => {
    expect(() => replay({ version: 2, recordings: [] } as never)).toThrow(/version: 2.*Expected 3/s);
  });
});
