import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { LlmExamplesModule } from '../../../llm-examples.module';
import { StructuredOutputExampleWorkflow } from '../structured-output-example.workflow';

const HELLO_WORLD = {
  filename: 'hello.py',
  description: 'Prints Hello, World! in Python',
  code: 'print("Hello, World!")',
};

/**
 * Structured output: `llm_generate_object` returns an object validated against a document
 * schema. Replaying its envelope lets the test assert that the workflow saved the typed
 * document and surfaced it as the result — without a live model.
 */
describe('StructuredOutputExampleWorkflow', () => {
  it('saves the replayed structured object as a FileDocument and returns it', async () => {
    const run = await runWorkflow(
      StructuredOutputExampleWorkflow,
      { language: 'python' },
      {
        imports: [LlmProviderModule, LlmExamplesModule],
        replay: replay({
          version: 3,
          recordings: [{ tool: 'llm_generate_object', envelope: { data: { data: HELLO_WORLD, response: {} } } }],
        }),
      },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual(HELLO_WORLD);
    expect(run.document('file')).toMatchObject({ filename: 'hello.py' });
  });
});
