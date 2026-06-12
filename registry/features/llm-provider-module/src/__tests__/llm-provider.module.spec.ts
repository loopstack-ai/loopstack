import type { DynamicModule, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { LLM_MODULE_CONFIG, type LlmModuleConfig } from '../llm-provider.constants.js';
import { LlmProviderModule } from '../llm-provider.module.js';
import { LlmProviderRegistry } from '../services/llm-provider-registry.js';

// Cross-package deps (TOOL_REGISTRY, ToolPipeline, etc. from @loopstack/core/common) are out of scope
// for this test — we only care that LlmProviderModule wires its OWN providers and config correctly.
// useMocker stubs any unresolved injection token with an empty object.
function build(imports: Array<Type<unknown> | DynamicModule>) {
  return Test.createTestingModule({ imports })
    .useMocker(() => ({}))
    .compile();
}

describe('LlmProviderModule import forms', () => {
  it('bare import registers the registry and applies the default empty config globally', async () => {
    const moduleRef = await build([LlmProviderModule]);

    expect(moduleRef.get(LlmProviderRegistry, { strict: false })).toBeInstanceOf(LlmProviderRegistry);
    expect(moduleRef.get<LlmModuleConfig>(LLM_MODULE_CONFIG, { strict: false })).toEqual({});

    await moduleRef.close();
  });

  it('forRoot({}) registers the registry and applies an empty global config', async () => {
    const moduleRef = await build([LlmProviderModule.forRoot({})]);

    expect(moduleRef.get(LlmProviderRegistry, { strict: false })).toBeInstanceOf(LlmProviderRegistry);
    expect(moduleRef.get<LlmModuleConfig>(LLM_MODULE_CONFIG, { strict: false })).toEqual({});

    await moduleRef.close();
  });

  it('forRoot(config) makes the global config visible everywhere', async () => {
    const moduleRef = await build([LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' })]);

    expect(moduleRef.get<LlmModuleConfig>(LLM_MODULE_CONFIG, { strict: false })).toEqual({
      model: 'claude-sonnet-4-6',
    });

    await moduleRef.close();
  });

  it('bare import alongside forRoot(config) — forRoot wins (bare import is a no-op overlap)', async () => {
    // Edge case: a user could write both bare and forRoot(config) in the same imports list
    // (e.g. via a refactor). We don't endorse this combination, but verify it doesn't silently
    // shadow the explicit forRoot config with the bare import's default.
    const moduleRef = await build([LlmProviderModule, LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' })]);

    expect(moduleRef.get<LlmModuleConfig>(LLM_MODULE_CONFIG, { strict: false })).toEqual({
      model: 'claude-sonnet-4-6',
    });

    await moduleRef.close();
  });
});
