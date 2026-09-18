import type { TestingModule } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { testTool } from '@loopstack/testing';
import { MathService } from '../services/math.service';
import { CounterTool, MathSumTool } from '../tools';

/**
 * Tool unit tests — the smallest unit a tool author works with. `call()` runs the tool through the
 * real pipeline (validation, config merge, interceptors), so these assert the tool exactly as a
 * workflow would see it.
 *
 * Acceptance criteria:
 *   C1 — a stateless tool returns the value its injected service computed.
 *   C2 — a stateful tool carries its own state across calls on the same instance.
 */
describe('MathSumTool', () => {
  let module: TestingModule;
  afterEach(() => module?.close());

  it('C1: returns the sum computed by the injected service', async () => {
    module = await testTool().forTool(MathSumTool).withProvider(MathService).compile();
    const tool = module.get(MathSumTool);

    const result = await tool.call({ a: 2, b: 3 });

    expect(result.data).toBe(5);
  });
});

describe('CounterTool', () => {
  let module: TestingModule;
  afterEach(() => module?.close());

  it('C2: keeps its own state across calls', async () => {
    module = await testTool().forTool(CounterTool).compile();
    const tool = module.get(CounterTool);

    expect((await tool.call()).data).toBe(1);
    expect((await tool.call()).data).toBe(2);
    expect((await tool.call()).data).toBe(3);
  });
});
