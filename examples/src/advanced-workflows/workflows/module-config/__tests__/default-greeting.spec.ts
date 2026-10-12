import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { DefaultGreetingModule } from '../consumers/default-greeting.module';
import { DefaultGreetingWorkflow } from '../consumers/default-greeting.workflow';
import { GreeterModule } from '../greeter/index';

describe('DefaultGreetingWorkflow', () => {
  it('greets with the global forRoot() config when its module imports no forFeature()', async () => {
    const run = await runWorkflow(DefaultGreetingWorkflow, undefined, {
      imports: [GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }), DefaultGreetingModule],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.documents.map((d) => (d.content as { text?: string }).text)).toEqual([
      '[Default] Hello, World! [language=en]',
    ]);
  });
});
