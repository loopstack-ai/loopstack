import { describe, expect, it } from 'vitest';
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
  });

  it('replays the scripted tool responses strictly in sequence', async () => {
    const run = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: [CounterTool, MathSumTool, MathService],
        answers: { userContinue: {} },
        replay: replay({
          version: 2,
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
