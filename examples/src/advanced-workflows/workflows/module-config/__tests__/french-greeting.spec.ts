import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { FrenchGreetingModule } from '../consumers/french-greeting.module';
import { FrenchGreetingWorkflow } from '../consumers/french-greeting.workflow';
import { GreeterModule } from '../greeter/index';

describe('FrenchGreetingWorkflow', () => {
  it('greets with its module forFeature() config instead of the global forRoot() config', async () => {
    const run = await runWorkflow(FrenchGreetingWorkflow, undefined, {
      imports: [GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }), FrenchGreetingModule],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.documents.map((d) => (d.content as { text?: string }).text)).toEqual([
      '[French] Bonjour, Monde! [language=fr]',
    ]);
  });
});
