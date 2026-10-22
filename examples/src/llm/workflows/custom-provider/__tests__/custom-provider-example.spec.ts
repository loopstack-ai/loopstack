import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { runWorkflow } from '@loopstack/testing';
import { LlmExamplesModule } from '../../../llm-examples.module';
import { CustomProviderExampleWorkflow } from '../custom-provider-example.workflow';

/**
 * No replay: `llm_generate_text` runs for real and routes `config.provider: 'echo'` through
 * `LlmProviderRegistry` to `EchoLlmProvider`, which registered itself when the module started.
 */
describe('CustomProviderExampleWorkflow', () => {
  it('answers through the echo provider and saves its reply under the provider id', async () => {
    const run = await runWorkflow(
      CustomProviderExampleWorkflow,
      { message: 'Hello, custom provider!' },
      { imports: [LlmProviderModule, LlmExamplesModule] },
    );

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ text: 'Echo: Hello, custom provider!' });

    const [question, reply] = run.documents;
    expect(question.content).toMatchObject({ role: 'user', text: 'Hello, custom provider!' });
    expect(reply.content).toMatchObject({ role: 'assistant', text: 'Echo: Hello, custom provider!' });
    expect(reply.meta).toMatchObject({
      provider: 'echo',
      response: { model: 'echo-1', content: 'Echo: Hello, custom provider!' },
    });
  });
});
