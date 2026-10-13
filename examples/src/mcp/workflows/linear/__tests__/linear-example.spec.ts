import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import type { StatelessChildRecord } from '@loopstack/common';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider';
import { McpClientService, type McpToolConfig, assertMcpUrlSafe } from '@loopstack/mcp';
import { replay, runWorkflow } from '@loopstack/testing';
import { McpExamplesModule } from '../../../mcp-examples.module';
import { LinearExampleWorkflow } from '../linear-example.workflow';

const LINEAR_URL = 'https://mcp.linear.app/mcp';

const LINEAR_TOOLS = [{ name: 'list_issues', description: 'List issues in Linear.', inputSchema: { type: 'object' } }];

const ISSUES = [{ identifier: 'LIN-1', title: 'Fix login', priority: 1, assignee: 'Ada', status: 'In Progress' }];

const SUMMARY = 'LIN-1 "Fix login" is your top issue (priority 1, Ada, In Progress).';

/**
 * Stands in for the network only. Each call runs the same allowlist check and header merge as the real
 * client — on the config the tool resolved from `McpModule.forRoot` — and then returns scripted data
 * instead of connecting.
 */
class FakeMcpClient extends McpClientService {
  readonly connections: Array<{ host: string; headers: Record<string, string> }> = [];

  async listTools(rawUrl: string, config: McpToolConfig) {
    await this.connectFake(rawUrl, config);
    return { tools: LINEAR_TOOLS };
  }

  async callTool(rawUrl: string, config: McpToolConfig, toolName: string) {
    await this.connectFake(rawUrl, config);
    if (toolName !== 'list_issues') throw new Error(`unexpected tool ${toolName}`);
    return { kind: 'callToolResult' as const, content: [{ type: 'text', text: JSON.stringify(ISSUES) }] };
  }

  private async connectFake(rawUrl: string, config: McpToolConfig) {
    const url = await assertMcpUrlSafe(rawUrl, config.allowedHosts, false, { skipDnsResolution: true });
    this.connections.push({ host: url.hostname, headers: this.mergeHeaders(config, url) });
  }
}

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

const LIST_TOOLS_TURN = toolCallTurn('1', 'mcp_list_tools', { serverUrl: LINEAR_URL });

const callTurn = (serverUrl: string) =>
  toolCallTurn('2', 'mcp_call', { serverUrl, toolName: 'list_issues', arguments: { assignee: 'me' } });

const TEXT_TURN = llmTurn({
  id: '3',
  role: 'assistant',
  text: SUMMARY,
  blocks: [{ type: 'text', text: SUMMARY }],
  stopReason: 'end_turn',
});

/** The `tool_result` blocks the chat agent fed back to the LLM, in order. */
function toolResults(agent: StatelessChildRecord) {
  type Block = { type: string; content?: string; isError?: boolean };
  return agent.documents.flatMap((d) =>
    ((d.content as { blocks?: Block[] }).blocks ?? []).filter((b) => b.type === 'tool_result'),
  );
}

/**
 * The LLM is the replay boundary and the fake client replaces the network. `mcp_list_tools` and
 * `mcp_call` run live, so the module's `McpModule.forRoot` config — allowlist and header mapping —
 * is what decides each call.
 */
describe('LinearExampleWorkflow', () => {
  const imports = [LlmProviderModule, AgentModule, McpExamplesModule];
  let mcp: FakeMcpClient;

  beforeEach(() => {
    vi.stubEnv('LINEAR_MCP_TOKEN', 'Bearer lin_test');
    mcp = new FakeMcpClient();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists and calls Linear tools with the auth header from LINEAR_MCP_TOKEN', async () => {
    const run = await runWorkflow(LinearExampleWorkflow, undefined, {
      imports,
      overrides: [[McpClientService, mcp]],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [LIST_TOOLS_TURN, callTurn(LINEAR_URL), TEXT_TURN] }),
    });

    expect(run.error).toBeUndefined();
    // The chat agent answered and waits for the user's next message.
    expect(run.status).toBe('waiting');
    const agent = run.children[0];
    expect(agent.workflowName).toBe('chat_agent');
    expect(agent.availableTransitions.map((t) => t.id)).toContain('userMessage');

    // hostHeaderEnv maps mcp.linear.app → Authorization from LINEAR_MCP_TOKEN, for both tools.
    expect(mcp.connections).toEqual([
      { host: 'mcp.linear.app', headers: { authorization: 'Bearer lin_test' } },
      { host: 'mcp.linear.app', headers: { authorization: 'Bearer lin_test' } },
    ]);

    const [listed, called] = toolResults(agent);
    expect(listed.isError).toBeFalsy();
    expect(listed.content).toContain('list_issues');
    expect(called.isError).toBeFalsy();
    expect(called.content).toContain('LIN-1');
  });

  it('refuses a server outside allowedHosts and reports the error to the LLM', async () => {
    const run = await runWorkflow(LinearExampleWorkflow, undefined, {
      imports,
      overrides: [[McpClientService, mcp]],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: [callTurn('https://evil.example/mcp'), TEXT_TURN] }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(mcp.connections).toEqual([]);
    expect(toolResults(run.children[0])).toEqual([
      expect.objectContaining({ isError: true, content: expect.stringContaining('evil.example') }),
    ]);
  });
});
