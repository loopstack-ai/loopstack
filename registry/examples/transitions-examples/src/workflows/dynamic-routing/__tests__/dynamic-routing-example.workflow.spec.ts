import { describe, expect, it } from 'vitest';
import { type TestRun, coverage, runWorkflow } from '@loopstack/testing';
import { DynamicRoutingExampleWorkflow } from '../dynamic-routing-example.workflow';

/**
 * The concept under test: several transitions leave the same place and a `@Guard` decides which
 * one fires, highest `priority` first, with the un-prioritised transition acting as the fallback.
 * Assert the *path* — the route taken is the whole point.
 *
 * Acceptance criteria:
 *   C1 — a value over 200 clears both guards and routes prepared → placeA → placeC.
 *   C2 — a value between 101 and 200 clears the first guard only and falls back to placeD.
 *   C3 — a value of 100 or less clears no guard and falls back to placeB.
 */
describe('DynamicRoutingExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const route = async (value: number) => {
    const run = await runWorkflow(DynamicRoutingExampleWorkflow, { value });
    runs.push(run);
    return run;
  };

  it('C1: routes a value above 200 through both guarded transitions', async () => {
    const run = await route(250);

    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['createMockData', 'routeToPlaceA', 'routeToPlaceC', 'showMessagePlaceC']);
    expect(run.document('message')).toMatchObject({ text: 'Value is greater than 200' });
  });

  it('C2: falls back to placeD when only the first guard passes', async () => {
    const run = await route(150);

    expect(run.path).toEqual(['createMockData', 'routeToPlaceA', 'routeToPlaceD', 'showMessagePlaceD']);
    expect(run.document('message')).toMatchObject({ text: 'Value is less or equal 200, but greater than 100' });
  });

  it('C3: falls back to placeB when no guard passes', async () => {
    const run = await route(50);

    expect(run.path).toEqual(['createMockData', 'routeToPlaceB', 'showMessagePlaceB']);
    expect(run.document('message')).toMatchObject({ text: 'Value is less or equal 100' });
  });

  it('covers every declared transition and park (coverage gate)', () => {
    const cov = coverage(runs, DynamicRoutingExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
    expect(cov.complete).toBe(true);
  });
});
