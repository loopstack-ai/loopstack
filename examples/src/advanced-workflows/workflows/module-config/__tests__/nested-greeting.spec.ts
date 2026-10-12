import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { NestedGreetingModule } from '../consumers/nested-greeting.module';
import { NestedGreetingWorkflow } from '../consumers/nested-greeting.workflow';
import { GreeterModule } from '../greeter/index';

describe('NestedGreetingWorkflow', () => {
  it('greets with the config passed through the wrapper module forFeature()', async () => {
    const run = await runWorkflow(NestedGreetingWorkflow, undefined, {
      imports: [GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }), NestedGreetingModule],
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.documents.map((d) => (d.content as { text?: string }).text)).toEqual([
      '[Nested/Spanish] Hola, Mundo! [language=es]',
    ]);
  });
});
