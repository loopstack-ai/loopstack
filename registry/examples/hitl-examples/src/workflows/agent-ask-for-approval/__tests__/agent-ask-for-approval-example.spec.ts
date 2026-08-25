import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { replay, runWorkflow } from '@loopstack/testing';
import { HitlExamplesModule } from '../../../hitl-examples.module';
import { AgentAskForApprovalExampleWorkflow } from '../agent-ask-for-approval-example.workflow';

const DRAFT = '## v1.2.3\n\n- Added webhook signature verification\n- Fixed a date-parsing bug in the importer';

/**
 * A scripted agent LLM turn in the shape `llm_generate_text` returns — including the
 * `documents` declaration the live tool emits, so replay materializes the assistant message
 * as a conversation document exactly like a real call would.
 */
const llmTurn = (message: { id: string; role: string; text: string; blocks: unknown[]; stopReason: string }) => ({
  tool: 'llm_generate_text',
  envelope: {
    data: { message, response: {} },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
    documents: [{ documentName: 'llm_message', content: message, options: { meta: { provider: 'claude' } } }],
  },
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
    // The approved markdown was published as a document by the parent (an observable outcome).
    expect(run.documents.some((d) => (d.content as { markdown?: string }).markdown === DRAFT)).toBe(true);
  });

  it('completes with the rejection response when the user denies', async () => {
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
  });

  it('parks showing the approval form when no answer is scripted', async () => {
    const run = await runWorkflow(AgentAskForApprovalExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule, HitlExamplesModule],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [DRAFT_TURN] }),
    });

    expect(run.status).toBe('waiting');
    // The agent's ask_for_approval tool launched a ConfirmUserWorkflow presenting the draft;
    // parkView() surfaces the review form the user would act on.
    const view = run.parkView();
    expect(view).toMatchObject({
      workflowName: 'confirm_user',
      widget: 'form',
      content: { markdown: DRAFT },
      actions: ['Deny', 'Confirm'],
    });
  });
});
