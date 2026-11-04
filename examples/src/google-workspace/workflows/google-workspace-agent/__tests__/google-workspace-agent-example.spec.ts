import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import type { StatelessChildRecord } from '@loopstack/common';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider';
import { OAuthTokenStore, OAuthWorkflow } from '@loopstack/oauth';
import { replay, runWorkflow } from '@loopstack/testing';
import { GoogleWorkspaceExamplesModule } from '../../../google-workspace-examples.module';
import { GoogleWorkspaceAgentExampleWorkflow } from '../google-workspace-agent-example.workflow';

/** A scripted agent LLM turn in the shape `llm_generate_text` returns. */
const llmTurn = (message: { id: string; role: string; text: string; blocks: unknown[]; stopReason: string }) => ({
  tool: 'llm_generate_text',
  envelope: {
    data: { message, response: {} },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
    documents: [{ documentName: 'llm_message', content: message, options: { meta: { provider: 'claude' } } }],
  },
});

const toolCallTurn = (id: string, name: string, args: Record<string, unknown>) =>
  llmTurn({
    id,
    role: 'assistant',
    text: '',
    blocks: [{ type: 'tool_call', id: `toolu_${id}`, name, args }],
    stopReason: 'tool_use',
  });

const textTurn = (id: string, text: string) =>
  llmTurn({ id, role: 'assistant', text, blocks: [{ type: 'text', text }], stopReason: 'end_turn' });

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

const CALENDAR_LIST = {
  items: [{ id: 'primary', summary: 'Ada Lovelace', primary: true, timeZone: 'Europe/London' }],
};

/** The `tool_result` blocks the chat agent fed back to the LLM, in order. */
function toolResults(agent: StatelessChildRecord) {
  type Block = { type: string; content?: string; isError?: boolean };
  return agent.documents.flatMap((d) =>
    ((d.content as { blocks?: Block[] }).blocks ?? []).filter((b) => b.type === 'tool_result'),
  );
}

/**
 * The LLM is the replay boundary. The `chat_agent` child, the real Google tools from `GoogleWorkspaceModule`
 * and `authenticate_google` run live. Only the token store, the network (`fetch`) and the OAuth sub-workflow
 * are fakes.
 */
describe('GoogleWorkspaceAgentExampleWorkflow', () => {
  const imports = [LlmProviderModule, AgentModule, GoogleWorkspaceExamplesModule];
  let tokenStore: { getValidAccessToken: ReturnType<typeof vi.fn> };
  let oAuthWorkflow: { run: ReturnType<typeof vi.fn> };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tokenStore = { getValidAccessToken: vi.fn() };
    oAuthWorkflow = { run: vi.fn().mockResolvedValue({ workflowId: 'oauth-1' }) };
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(CALENDAR_LIST), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls authenticate_google when a Google tool reports unauthorized, and starts the Google sign-in', async () => {
    tokenStore.getValidAccessToken.mockResolvedValue(undefined);

    const run = await runWorkflow(GoogleWorkspaceAgentExampleWorkflow, undefined, {
      imports,
      overrides: [
        [OAuthTokenStore, tokenStore],
        [OAuthWorkflow, oAuthWorkflow],
      ],
      replayTools: [LlmGenerateTextTool],
      replay: replay({
        version: 3,
        recordings: [
          toolCallTurn('1', 'google_calendar_list_calendars', {}),
          toolCallTurn('2', 'authenticate_google', { scopes: [CALENDAR_SCOPE] }),
        ],
      }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(fetchMock).not.toHaveBeenCalled();

    const agent = run.children[0];
    expect(agent.workflowName).toBe('chat_agent');
    expect(toolResults(agent)).toEqual([
      expect.objectContaining({ isError: true, content: expect.stringContaining('No valid Google token found') }),
    ]);
    expect(oAuthWorkflow.run).toHaveBeenCalledWith(
      { provider: 'google', scopes: [CALENDAR_SCOPE] },
      expect.objectContaining({ show: 'inline' }),
    );
    // The chat agent waits for the sign-in before its next LLM turn.
    expect(run.parkView()).toMatchObject({ workflowName: 'chat_agent', defaultTransition: 'cancelPendingTools' });
  });

  it('feeds the Google API result back to the LLM when a token is stored', async () => {
    tokenStore.getValidAccessToken.mockResolvedValue('ya29_test');

    const run = await runWorkflow(GoogleWorkspaceAgentExampleWorkflow, undefined, {
      imports,
      overrides: [
        [OAuthTokenStore, tokenStore],
        [OAuthWorkflow, oAuthWorkflow],
      ],
      replayTools: [LlmGenerateTextTool],
      replay: replay({
        version: 3,
        recordings: [
          toolCallTurn('1', 'google_calendar_list_calendars', {}),
          textTurn('2', 'You have one calendar: Ada Lovelace.'),
        ],
      }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(tokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'google');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://www.googleapis.com/calendar/v3/users/me/calendarList'),
      expect.objectContaining({ headers: { Authorization: 'Bearer ya29_test' } }),
    );
    expect(oAuthWorkflow.run).not.toHaveBeenCalled();

    const agent = run.children[0];
    expect(agent.availableTransitions.map((t) => t.id)).toContain('userMessage');
    const [calendars] = toolResults(agent);
    expect(calendars.isError).toBeFalsy();
    expect(calendars.content).toContain('Ada Lovelace');
  });
});
