import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AgentAskClarificationExampleWorkflow } from '../agent-ask-clarification-example.workflow';

/**
 * Live-LLM check-up (`npm run test:live`, needs ANTHROPIC_API_KEY): the real model runs the
 * agent loop and should ask for clarification per its system prompt; the scripted answer
 * resumes it. Assertions are structural — completion and a non-empty recommendation.
 */
describe('AgentAskClarificationExampleWorkflow — live', () => {
  it('asks for clarification, receives the answer, and recommends a destination', async () => {
    const run = await runWorkflow(AgentAskClarificationExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule, HitlExamplesModule],
      answers: { userAnswered: { answer: 'Budget €2000, warm climate please' } },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentComplete']);

    const result = run.result as { response: string };
    expect(result.response.length).toBeGreaterThan(0);
  });
});
