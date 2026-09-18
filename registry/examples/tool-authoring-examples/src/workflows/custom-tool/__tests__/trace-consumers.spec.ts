import { describe, expect, it } from 'vitest';
import { coverage, createContractFake, diffTraces, runWorkflow } from '@loopstack/testing';
import { CustomToolExampleWorkflow } from '../custom-tool-example.workflow';
import { MathService } from '../services/math.service';
import { CounterTool, MathSumTool } from '../tools';

const PROVIDERS = [CounterTool, MathSumTool, MathService];

describe('coverage — state-machine coverage over run traces', () => {
  it('reports full coverage when runs exercise every transition and park', async () => {
    const completed = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: PROVIDERS,
        answers: { userContinue: {} },
      },
    );
    const parked = await runWorkflow(CustomToolExampleWorkflow, { a: 1, b: 1 }, { providers: PROVIDERS });

    const cov = coverage([completed, parked], CustomToolExampleWorkflow);

    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
    expect(cov.complete).toBe(true);
    expect(cov.parkedOn).toContain('userContinue');
  });

  it('names what a partial suite leaves untested', async () => {
    // Only the parked run: the wait transition and everything after it never execute.
    const parked = await runWorkflow(CustomToolExampleWorkflow, { a: 1, b: 1 }, { providers: PROVIDERS });

    const cov = coverage([parked], CustomToolExampleWorkflow);

    expect(cov.complete).toBe(false);
    expect(cov.missingTransitions).toContain('userContinue');
    expect(cov.missingTransitions).toContain('continueCount');
    expect(cov.executedTransitions).toContain('calculate');
  });
});

describe('diffTraces — first divergence between two runs', () => {
  it('diffs clean for two runs of identical behavior despite differing timings', async () => {
    const first = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: PROVIDERS,
        answers: { userContinue: {} },
      },
    );
    const second = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: PROVIDERS,
        answers: { userContinue: {} },
      },
    );

    expect(diffTraces(first.trace, second.trace)).toBeNull();
  });

  it('reports the first point where two runs stopped doing the same thing', async () => {
    const completed = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: PROVIDERS,
        answers: { userContinue: {} },
      },
    );
    const parked = await runWorkflow(CustomToolExampleWorkflow, { a: 2, b: 3 }, { providers: PROVIDERS });

    const divergence = diffTraces(completed.trace, parked.trace);

    expect(divergence).not.toBeNull();
    expect(divergence!.reason).toBeTruthy();
    // Both runs agree up to the park — the divergence is at or after the settle.
    expect(divergence!.index).toBeGreaterThan(0);
  });
});

describe('createContractFake — contract-validated DI mocks', () => {
  it('validates scripted envelopes against the resultSchema at scripting time', () => {
    const fake = createContractFake(MathSumTool);

    expect(() => fake.returns({ data: 'not-a-number' })).toThrow(/result violates its resultSchema/);
    expect(() => fake.returns({ data: 42 })).not.toThrow();
  });

  it('feeds validated responses into the workflow and supports interaction assertions', async () => {
    const fake = createContractFake(MathSumTool).returns({ data: 999 });

    const run = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: [{ provide: MathSumTool, useValue: fake }, CounterTool, MathService],
        answers: { userContinue: {} },
      },
    );

    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ total: 999 });
    expect(fake.call).toHaveBeenCalledWith({ a: 2, b: 3 });
  });

  it('rejects unscripted calls loudly', async () => {
    const fake = createContractFake(MathSumTool);

    const run = await runWorkflow(
      CustomToolExampleWorkflow,
      { a: 2, b: 3 },
      {
        providers: [{ provide: MathSumTool, useValue: fake }, CounterTool, MathService],
      },
    );

    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/Unscripted contract fake call on 'math_sum'/);
  });
});
