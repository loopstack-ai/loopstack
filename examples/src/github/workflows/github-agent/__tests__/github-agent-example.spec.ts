import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import type { StatelessChildRecord } from '@loopstack/common';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider';
import { OAuthTokenStore, OAuthWorkflow } from '@loopstack/oauth';
import { replay, runWorkflow } from '@loopstack/testing';
import { GitHubExamplesModule } from '../../../github-examples.module';
import { GithubAgentExampleWorkflow } from '../github-agent-example.workflow';

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

const GITHUB_USER = {
  id: 1,
  login: 'octocat',
  name: 'The Octocat',
  email: null,
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  html_url: 'https://github.com/octocat',
  bio: null,
  public_repos: 8,
  followers: 10,
  following: 0,
  created_at: '2011-01-25T18:44:36Z',
};

/** The `tool_result` blocks the chat agent fed back to the LLM, in order. */
function toolResults(agent: StatelessChildRecord) {
  type Block = { type: string; content?: string; isError?: boolean };
  return agent.documents.flatMap((d) =>
    ((d.content as { blocks?: Block[] }).blocks ?? []).filter((b) => b.type === 'tool_result'),
  );
}

/**
 * The LLM is the replay boundary. The `chat_agent` child, the real GitHub tools from `GitHubModule` and
 * `authenticate_github` run live. Only the token store, the network (`fetch`) and the OAuth sub-workflow
 * are fakes.
 */
describe('GithubAgentExampleWorkflow', () => {
  const imports = [LlmProviderModule, AgentModule, GitHubExamplesModule];
  let tokenStore: { getValidAccessToken: ReturnType<typeof vi.fn> };
  let oAuthWorkflow: { run: ReturnType<typeof vi.fn> };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tokenStore = { getValidAccessToken: vi.fn() };
    oAuthWorkflow = { run: vi.fn().mockResolvedValue({ workflowId: 'oauth-1' }) };
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(GITHUB_USER), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls authenticate_github when a GitHub tool reports unauthorized, and starts the GitHub sign-in', async () => {
    tokenStore.getValidAccessToken.mockResolvedValue(undefined);

    const run = await runWorkflow(GithubAgentExampleWorkflow, undefined, {
      imports,
      overrides: [
        [OAuthTokenStore, tokenStore],
        [OAuthWorkflow, oAuthWorkflow],
      ],
      replayTools: [LlmGenerateTextTool],
      replay: replay({
        version: 3,
        recordings: [
          toolCallTurn('1', 'github_get_authenticated_user', {}),
          toolCallTurn('2', 'authenticate_github', { scopes: ['user'] }),
        ],
      }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(fetchMock).not.toHaveBeenCalled();

    const agent = run.children[0];
    expect(agent.workflowName).toBe('chat_agent');
    expect(toolResults(agent)).toEqual([
      expect.objectContaining({ isError: true, content: expect.stringContaining('No valid GitHub token found') }),
    ]);
    expect(oAuthWorkflow.run).toHaveBeenCalledWith(
      { provider: 'github', scopes: ['user'] },
      expect.objectContaining({ show: 'inline' }),
    );
    // The chat agent waits for the sign-in before its next LLM turn.
    expect(run.parkView()).toMatchObject({ workflowName: 'chat_agent', defaultTransition: 'cancelPendingTools' });
  });

  it('feeds the GitHub API result back to the LLM when a token is stored', async () => {
    tokenStore.getValidAccessToken.mockResolvedValue('gho_test');

    const run = await runWorkflow(GithubAgentExampleWorkflow, undefined, {
      imports,
      overrides: [
        [OAuthTokenStore, tokenStore],
        [OAuthWorkflow, oAuthWorkflow],
      ],
      replayTools: [LlmGenerateTextTool],
      replay: replay({
        version: 3,
        recordings: [toolCallTurn('1', 'github_get_authenticated_user', {}), textTurn('2', 'You are octocat.')],
      }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(tokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer gho_test' }) }),
    );
    expect(oAuthWorkflow.run).not.toHaveBeenCalled();

    const agent = run.children[0];
    expect(agent.availableTransitions.map((t) => t.id)).toContain('userMessage');
    const [user] = toolResults(agent);
    expect(user.isError).toBeFalsy();
    expect(user.content).toContain('octocat');
  });
});
