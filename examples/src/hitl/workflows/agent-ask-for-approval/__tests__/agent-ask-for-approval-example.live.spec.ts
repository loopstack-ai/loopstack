import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AgentAskForApprovalExampleWorkflow } from '../agent-ask-for-approval-example.workflow';

/**
 * Live-LLM check-up (`npm run test:live`, needs ANTHROPIC_API_KEY): the real model drafts
 * release notes and requests approval; the scripted confirmation resumes it. Assertions are
 * structural — completion and a non-empty markdown response.
 */
describe('AgentAskForApprovalExampleWorkflow — live', () => {
  it('drafts release notes, gets approval, and responds with the markdown', async () => {
    const run = await runWorkflow(AgentAskForApprovalExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule, HitlExamplesModule],
      answers: { userConfirmed: {} },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentComplete']);

    const result = run.result as { response: string };
    expect(result.response.length).toBeGreaterThan(0);
  });
});
