import { DynamicModule } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it } from 'vitest';
import { AgentModule } from '@loopstack/agent';
import { CodeAgentModule } from '../code-agent.module.js';
import { ExploreTask } from '../tools/explore-task.tool.js';

describe('CodeAgentModule', () => {
  it('imports AgentModule and provides and exports ExploreTask', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, CodeAgentModule)).toEqual([AgentModule]);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CodeAgentModule)).toEqual([ExploreTask]);
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, CodeAgentModule)).toEqual([ExploreTask, AgentModule]);
  });

  it('forFeature imports a feature-scoped AgentModule and exposes the same providers', () => {
    const dynamic = CodeAgentModule.forFeature({ llm: { provider: 'openai', model: 'gpt-x' } });
    const agentImport = dynamic.imports?.[0] as DynamicModule;

    expect(dynamic.module).not.toBe(CodeAgentModule);
    expect(dynamic.imports).toHaveLength(1);
    expect(agentImport.module).toBe(AgentModule.forFeature().module);
    expect(agentImport.imports).toHaveLength(1);
    expect(dynamic.providers).toEqual([ExploreTask]);
    expect(dynamic.exports).toEqual([ExploreTask, AgentModule]);
  });

  it('forFeature without config imports an unconfigured AgentModule', () => {
    const agentImport = CodeAgentModule.forFeature().imports?.[0] as DynamicModule;

    expect(agentImport.imports).toEqual([]);
  });
});
