import type { TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { BaseWorkflow } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createTestingModule, mockCoreModuleProviders } from '@loopstack/testing';
import { ModuleConfigExamplesModule } from '../../module-config-examples.module';
import { DefaultGreetingModule } from '../../workflows/default-greeting/default-greeting.module';
import { DefaultGreetingWorkflow } from '../../workflows/default-greeting/default-greeting.workflow';
import { FrenchGreetingModule } from '../../workflows/french-greeting/french-greeting.module';
import { FrenchGreetingWorkflow } from '../../workflows/french-greeting/french-greeting.workflow';
import { GermanGreetingModule } from '../../workflows/german-greeting/german-greeting.module';
import { GermanGreetingWorkflow } from '../../workflows/german-greeting/german-greeting.workflow';
import { NestedGreetingModule } from '../../workflows/nested-greeting/nested-greeting.module';
import { NestedGreetingWorkflow } from '../../workflows/nested-greeting/nested-greeting.workflow';

/**
 * The concept under test is a **DI** one: which `GreeterConfig` a module's `GreeterTool` resolves.
 * That only shows up when each workflow is instantiated inside its own module — so this test boots
 * the real app module and pulls each workflow from its own injector with `select(...)` before
 * running it. (`runWorkflow` registers the workflow at the test root instead, where every
 * `forFeature` override is invisible and the global `forRoot` config always wins.)
 *
 * Acceptance criteria:
 *   C1 — a module with no forFeature import inherits the global forRoot config.
 *   C2 — a module's own forFeature config overrides the global default for that module only.
 *   C3 — two sibling forFeature modules keep independent configs.
 *   C4 — a wrapper module's forFeature passes config through to the module it wraps.
 */
describe('GreeterModule forRoot / forFeature', () => {
  let moduleRef: TestingModule;
  let processor: WorkflowProcessorService;

  beforeAll(async () => {
    moduleRef = await mockCoreModuleProviders(
      createTestingModule({ imports: [LoopCoreModule.forTesting(), ModuleConfigExamplesModule], providers: [] }),
    ).compile();
    await moduleRef.init();
    processor = moduleRef.get(WorkflowProcessorService);
  });

  afterAll(() => moduleRef?.close());

  /** Runs a workflow resolved from its own module, and returns the greeting it rendered. */
  const greetFrom = async (module: Parameters<TestingModule['select']>[0], workflow: unknown) => {
    const instance = moduleRef.select(module).get(workflow as never, { strict: true }) as BaseWorkflow;
    const result = await processor.process(instance, {}, createStatelessContext());
    expect(result.status).toBe('completed');
    return (result.documents[0].content as { text: string }).text;
  };

  it('C1: inherits the global forRoot config when the module declares no override', async () => {
    expect(await greetFrom(DefaultGreetingModule, DefaultGreetingWorkflow)).toBe(
      '[Default] Hello, World! [language=en]',
    );
  });

  it('C2: a module-scoped forFeature overrides the global default', async () => {
    expect(await greetFrom(GermanGreetingModule, GermanGreetingWorkflow)).toBe('[German] Hallo, Welt! [language=de]');
  });

  it('C3: sibling forFeature modules keep independent configs', async () => {
    expect(await greetFrom(FrenchGreetingModule, FrenchGreetingWorkflow)).toBe(
      '[French] Bonjour, Monde! [language=fr]',
    );
    // Re-reading the German module proves the French override did not leak into it.
    expect(await greetFrom(GermanGreetingModule, GermanGreetingWorkflow)).toBe('[German] Hallo, Welt! [language=de]');
  });

  it('C4: a wrapper module passes its forFeature config through to the wrapped module', async () => {
    expect(await greetFrom(NestedGreetingModule, NestedGreetingWorkflow)).toBe(
      '[Nested/Spanish] Hola, Mundo! [language=es]',
    );
  });
});
