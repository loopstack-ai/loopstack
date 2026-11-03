import { describe, expect, it, vi } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { ExploreTask } from '@loopstack/code-agent';
import type { StatelessChildRecord } from '@loopstack/common';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider';
import { EnvironmentService, GlobTool, GrepTool, ReadTool, RemoteClient } from '@loopstack/remote-client';
import { replay, runWorkflow } from '@loopstack/testing';
import { ExploreTaskExampleWorkflow } from '../explore-task-example.workflow';

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

const APP_MODULE = '@Module({ imports: [ConfigModule, UsersModule] }) export class AppModule {}';

const FINDINGS = 'The root module is src/app.module.ts. It imports ConfigModule and UsersModule.';

const ANSWER = 'The root module imports ConfigModule and UsersModule. Read UsersModule first.';

/**
 * One script in call order across the run tree: the main agent delegates (1), the sub-agent
 * behind `explore_task` searches, reads and answers (2–4), and the main agent answers from
 * that answer (5).
 */
const RECORDINGS = [
  toolCallTurn('1', 'explore_task', { instructions: 'Find the root module and list the modules it imports.' }),
  toolCallTurn('2', 'glob', { pattern: '**/*.module.ts' }),
  toolCallTurn('3', 'read', { file_path: 'src/app.module.ts' }),
  textTurn('4', FINDINGS),
  textTurn('5', ANSWER),
];

/** The text of every message in an agent's conversation, tool results included. */
function conversation(agent: StatelessChildRecord): string {
  type Block = { type: string; text?: string; content?: string };
  return agent.documents
    .flatMap((d) => (d.content as { blocks?: Block[] }).blocks ?? [])
    .map((b) => b.text ?? b.content ?? '')
    .join('\n');
}

/**
 * The LLM is the replay boundary. `explore_task`, both agents and the real `glob` / `read` tools
 * run live; only the remote agent behind those tools is faked, so no sandbox is needed.
 */
describe('ExploreTaskExampleWorkflow', () => {
  it('delegates exploration to a sub-agent and answers from its findings', async () => {
    const environments = {
      assertReachable: vi.fn().mockResolvedValue('http://sandbox'),
      getAgentUrl: vi.fn().mockResolvedValue('http://sandbox'),
    };
    const remote = {
      glob: vi.fn().mockResolvedValue({ files: ['src/app.module.ts', 'src/users/users.module.ts'] }),
      readFile: vi.fn().mockResolvedValue({ content: APP_MODULE }),
    };

    const run = await runWorkflow(ExploreTaskExampleWorkflow, undefined, {
      imports: [LlmProviderModule, AgentModule],
      providers: [
        ExploreTask,
        GlobTool,
        GrepTool,
        ReadTool,
        { provide: EnvironmentService, useValue: environments },
        { provide: RemoteClient, useValue: remote },
      ],
      replayTools: [LlmGenerateTextTool],
      replay: replay({ version: 3, recordings: RECORDINGS }),
    });

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.path).toEqual(['verifyEnvironment', 'start', 'agentComplete']);
    expect(run.result).toEqual({ response: ANSWER });
    expect(environments.assertReachable).toHaveBeenCalledWith('sandbox');

    const mainAgent = run.children[0];
    expect(mainAgent.workflowName).toBe('agent');
    expect(mainAgent.status).toBe('completed');

    // explore_task launched a second agent, which searched and read the code on the remote agent.
    const subAgents = mainAgent.statelessState?.children ?? [];
    expect(subAgents.map((c) => [c.workflowName, c.status])).toEqual([['agent', 'completed']]);
    expect(remote.glob).toHaveBeenCalledWith('http://sandbox', '**/*.module.ts', undefined);
    expect(remote.readFile).toHaveBeenCalledWith('http://sandbox', 'src/app.module.ts', undefined, undefined);

    // The sub-agent's answer is the explore_task tool result. The file it read stays in its own
    // conversation and never reaches the main agent's context.
    expect(conversation(mainAgent)).toContain(FINDINGS);
    expect(conversation(mainAgent)).not.toContain(APP_MODULE);
    expect(conversation(subAgents[0])).toContain(APP_MODULE);
  });
});
