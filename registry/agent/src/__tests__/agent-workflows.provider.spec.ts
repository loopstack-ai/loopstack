import type { DynamicModule, Type } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RunContext } from '@loopstack/common';
import { LlmGenerateTextTool, LlmProviderModule, LlmProviderRegistry } from '@loopstack/llm-provider';
import type { LlmProviderInterface } from '@loopstack/llm-provider';
import { AgentModule } from '../agent.module.js';
import { AgentWorkflow } from '../workflows/agent.workflow.js';
import { ChatAgentWorkflow } from '../workflows/chat-agent.workflow.js';

// Cross-package deps (document store, tool registry, orchestrator, …) are stubbed by useMocker.
// The LLM call runs through the real LlmGenerateTextTool.handle, so provider and model are
// resolved exactly as at runtime; only the provider itself is a fake.
function build(imports: Array<Type<unknown> | DynamicModule>) {
  return Test.createTestingModule({ imports })
    .useMocker(() => ({}))
    .compile();
}

function fakeProvider(providerId: string) {
  return {
    providerId,
    generateText: vi.fn().mockResolvedValue({
      message: { role: 'assistant', text: 'ok', stopReason: 'end_turn' },
      response: {},
    }),
    extractUsage: vi.fn().mockReturnValue(undefined),
  };
}

type AgentLike = AgentWorkflow | ChatAgentWorkflow;

interface Harness {
  moduleRef: TestingModule;
  workflow: AgentLike;
  claude: ReturnType<typeof fakeProvider>;
  openai: ReturnType<typeof fakeProvider>;
}

const FEATURE_CONFIGURED = [
  LlmProviderModule.forRoot({}),
  AgentModule.forFeature({ llm: { provider: 'openai', model: 'gpt-x' } }),
];

async function setUp(
  workflowType: Type<AgentLike>,
  imports: Array<Type<unknown> | DynamicModule> = FEATURE_CONFIGURED,
): Promise<Harness> {
  const moduleRef = await build(imports);

  const registry = moduleRef.get(LlmProviderRegistry, { strict: false });
  const claude = fakeProvider('claude');
  const openai = fakeProvider('openai');
  registry.register(claude as unknown as LlmProviderInterface);
  registry.register(openai as unknown as LlmProviderInterface);

  const workflow = moduleRef.get<AgentLike>(workflowType, { strict: false });
  const internals = workflow as unknown as Record<string, unknown>;
  const tool = internals.llmGenerateText as LlmGenerateTextTool;
  const toolInternals = tool as unknown as Record<string, unknown>;
  toolInternals.documentStore = { findAllDocuments: () => [] };
  const handle = (toolInternals.handle as LlmGenerateTextTool['call']).bind(tool);
  vi.spyOn(tool, 'call').mockImplementation((args, options) =>
    (handle as (a: unknown, c: RunContext, o: unknown) => ReturnType<LlmGenerateTextTool['call']>)(
      args,
      {} as RunContext,
      options,
    ),
  );
  internals.assignState = vi.fn();

  return { moduleRef, workflow, claude, openai };
}

const baseState = { system: 's', tools: [], userMessage: 'hi' };

describe.each([
  ['AgentWorkflow', AgentWorkflow],
  ['ChatAgentWorkflow', ChatAgentWorkflow],
] as const)('%s LLM provider selection', (_name, workflowType) => {
  let harness: Harness | undefined;

  afterEach(async () => {
    await harness?.moduleRef.close();
    harness = undefined;
  });

  it('uses the provider and model configured via AgentModule.forFeature({ llm })', async () => {
    harness = await setUp(workflowType);

    await harness.workflow.llmTurn(baseState);

    expect(harness.claude.generateText).not.toHaveBeenCalled();
    expect(harness.openai.generateText).toHaveBeenCalledTimes(1);
    expect(harness.openai.generateText.mock.calls[0][0]).toMatchObject({ system: 's', model: 'gpt-x' });
  });

  it('uses the app-wide LlmProviderModule.forRoot config with a bare AgentModule import', async () => {
    harness = await setUp(workflowType, [
      LlmProviderModule.forRoot({ provider: 'openai', model: 'gpt-app' }),
      AgentModule,
    ]);

    await harness.workflow.llmTurn(baseState);

    expect(harness.claude.generateText).not.toHaveBeenCalled();
    expect(harness.openai.generateText.mock.calls[0][0]).toMatchObject({ model: 'gpt-app' });
  });

  it('lets per-run provider and model args override the module config', async () => {
    harness = await setUp(workflowType);

    await harness.workflow.llmTurn({ ...baseState, provider: 'claude', model: 'claude-x' });

    expect(harness.openai.generateText).not.toHaveBeenCalled();
    expect(harness.claude.generateText).toHaveBeenCalledTimes(1);
    expect(harness.claude.generateText.mock.calls[0][0]).toMatchObject({ model: 'claude-x' });
  });
});
