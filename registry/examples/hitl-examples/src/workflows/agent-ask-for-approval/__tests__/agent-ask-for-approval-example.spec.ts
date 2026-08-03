import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AgentAskForApprovalExampleWorkflow } from '../agent-ask-for-approval-example.workflow';

const DRAFT = '## v1.2.3\n\n- Added webhook signature verification\n- Fixed a date-parsing bug in the importer';

/** A scripted agent LLM turn in the shape `llm_generate_text` returns. */
const llmTurn = (message: object) => ({
  tool: 'llm_generate_text',
  envelope: { data: { message, response: {} }, metadata: { provider: 'claude', model: 'claude-sonnet-4-6' } },
});

const DRAFT_TURN = llmTurn({
  id: 'msg_1',
  role: 'assistant',
  text: '',
  blocks: [{ type: 'tool_call', id: 'toolu_1', name: 'ask_for_approval', args: { concept: DRAFT } }],
  stopReason: 'tool_use',
});

const FINAL_TURN = llmTurn({
  id: 'msg_2',
  role: 'assistant',
  text: DRAFT,
  blocks: [{ type: 'text', text: DRAFT }],
  stopReason: 'end_turn',
});

describe('AgentAskForApprovalExampleWorkflow', () => {
  it('approves the drafted markdown and completes with it as the response', async () => {
    const run = await runWorkflow(AgentAskForApprovalExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule, HitlExamplesModule],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [DRAFT_TURN, FINAL_TURN] }),
      answers: { userConfirmed: {} },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['start', 'agentComplete']);
    expect(run.result).toEqual({ response: DRAFT });

    // The real ConfirmUserWorkflow grandchild presented the draft and was confirmed
    const agent = run.children[0];
    const confirm = (agent.statelessState?.children ?? []).find((c) => c.workflowName === 'confirm_user');
    expect(confirm?.status).toBe('completed');
    expect(confirm?.result).toMatchObject({ confirmed: true, markdown: DRAFT });

    // The approved markdown was published as a document by the parent
    expect(run.documents.some((d) => (d.content as { markdown?: string }).markdown === DRAFT)).toBe(true);
  });

  it('denies the draft and parks awaiting the next scripted turn', async () => {
    const rejectionTurn = llmTurn({
      id: 'msg_2',
      role: 'assistant',
      text: 'The draft was rejected by the user.',
      blocks: [{ type: 'text', text: 'The draft was rejected by the user.' }],
      stopReason: 'end_turn',
    });

    const run = await runWorkflow(AgentAskForApprovalExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule, HitlExamplesModule],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [DRAFT_TURN, rejectionTurn] }),
      answers: { userDenied: {} },
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ response: 'The draft was rejected by the user.' });

    const agent = run.children[0];
    const confirm = (agent.statelessState?.children ?? []).find((c) => c.workflowName === 'confirm_user');
    expect(confirm?.result).toMatchObject({ confirmed: false });
  });
});
