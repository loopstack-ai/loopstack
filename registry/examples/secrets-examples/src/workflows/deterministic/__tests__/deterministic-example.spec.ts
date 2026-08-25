import { describe, expect, it } from 'vitest';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { SecretsModule } from '@loopstack/secrets-module';
import { type TestRun, coverage, replay, runWorkflow } from '@loopstack/testing';
import { SecretsExamplesModule } from '../../../secrets-examples.module';
import { DeterministicExampleWorkflow } from '../deterministic-example.workflow';

const KEYS = [
  { key: 'EXAMPLE_API_KEY', hasValue: true },
  { key: 'EXAMPLE_SECRET', hasValue: true },
];

/**
 * The secrets tools are backed by the secrets store (a DB service), so they run inside the
 * replay boundary: `request_secrets` and `get_secret_keys` are scripted. The workflow's own
 * HITL wait and verification logic run for real.
 */
describe('DeterministicExampleWorkflow', () => {
  const runs: TestRun[] = [];
  const requestSecrets = {
    tool: 'request_secrets',
    envelope: { data: { variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }] } },
  };
  const imports = [LlmProviderModule, SecretsModule.forFeature(), SecretsExamplesModule];

  it('parks on the secrets request form', async () => {
    const run = await runWorkflow(DeterministicExampleWorkflow, undefined, {
      imports,
      replay: replay({ version: 3, recordings: [requestSecrets] }),
    });
    runs.push(run);

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('requesting_secrets');

    const view = run.parkView();
    expect(view).toMatchObject({
      widget: 'secret-input',
      documentName: 'secret_request',
      content: { variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }] },
      defaultTransition: 'secretsSubmitted',
    });
  });

  it('verifies the stored keys after the user submits', async () => {
    const run = await runWorkflow(DeterministicExampleWorkflow, undefined, {
      imports,
      answers: { secretsSubmitted: {} },
      replay: replay({
        version: 3,
        recordings: [requestSecrets, { tool: 'get_secret_keys', envelope: { data: KEYS } }],
      }),
    });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    const texts = run.documents.map((d) => (d.content as { markdown?: string }).markdown ?? '');
    expect(texts.some((t) => t.includes('EXAMPLE_API_KEY'))).toBe(true);
  });

  it('covers every transition and park (coverage gate)', () => {
    const cov = coverage(runs, DeterministicExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
