import { describe, expect, it, vi } from 'vitest';
import { OAuthTokenStore, OAuthWorkflow } from '@loopstack/oauth';
import { type TestRun, coverage, failure, queue, runWorkflow } from '@loopstack/testing';
import { CustomOAuthProviderExampleWorkflow } from '../custom-oauth-provider-example.workflow';
import { MockApiClient } from '../mock-provider/mock-api.client';

/**
 * `OAuthModule` brings in a callback controller and `WorkflowRunner` that the hermetic facade does not
 * boot, so the token store, the API client and the OAuth sub-workflow are fakes. The spec asserts the
 * workflow's routing: sign in when there is no usable token, call the API when there is one.
 * `mock-oauth-provider.spec.ts` runs the provider against the mock server.
 */
const PROFILE = { id: 'mock-user-1', name: 'Ada Lovelace', email: 'ada@example.com' };

function setup(tokens: Array<string | undefined>) {
  const tokenStore = { getValidAccessToken: vi.fn() };
  for (const token of tokens) tokenStore.getValidAccessToken.mockResolvedValueOnce(token);
  const mockApi = {
    getProfile: vi.fn().mockImplementation((token: string) => (token === 'valid' ? PROFILE : undefined)),
  };
  const oAuthWorkflow = { run: vi.fn().mockResolvedValue(undefined) };
  const providers = [
    { provide: OAuthTokenStore, useValue: tokenStore },
    { provide: MockApiClient, useValue: mockApi },
    { provide: OAuthWorkflow, useValue: oAuthWorkflow },
  ];
  return { tokenStore, mockApi, oAuthWorkflow, providers };
}

describe('CustomOAuthProviderExampleWorkflow', () => {
  const runs: TestRun[] = [];

  it('runs the OAuth sub-workflow for the mock provider when no token is stored', async () => {
    const { tokenStore, mockApi, oAuthWorkflow, providers } = setup([undefined]);

    const run = await runWorkflow(CustomOAuthProviderExampleWorkflow, undefined, { providers });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('waiting');
    expect(run.place).toBe('awaiting_auth');
    expect(tokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'mock');
    expect(mockApi.getProfile).not.toHaveBeenCalled();
    expect(oAuthWorkflow.run).toHaveBeenCalledWith(
      { provider: 'mock', scopes: ['profile'] },
      expect.objectContaining({
        onSuccess: { transition: 'authCompleted' },
        onFailure: { transition: 'authFailed' },
      }),
    );
  });

  it('calls the API with the stored token after the sign-in', async () => {
    const { mockApi, oAuthWorkflow, providers } = setup([undefined, 'valid']);

    const run = await runWorkflow(CustomOAuthProviderExampleWorkflow, undefined, {
      providers,
      answers: { authCompleted: queue({ authenticated: true }) },
    });
    runs.push(run);

    expect(run.error).toBeUndefined();
    expect(run.status).toBe('completed');
    expect(run.result).toEqual({ profile: PROFILE });
    expect(mockApi.getProfile).toHaveBeenCalledWith('valid');
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(1);
  });

  it('signs in again when the API rejects the stored token', async () => {
    const { mockApi, oAuthWorkflow, providers } = setup(['revoked']);

    const run = await runWorkflow(CustomOAuthProviderExampleWorkflow, undefined, { providers });

    expect(run.place).toBe('awaiting_auth');
    expect(mockApi.getProfile).toHaveBeenCalledWith('revoked');
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(1);
  });

  it('waits at auth_failed when the OAuth sub-workflow fails', async () => {
    const { oAuthWorkflow, providers } = setup([undefined]);

    const run = await runWorkflow(CustomOAuthProviderExampleWorkflow, undefined, {
      providers,
      answers: { authFailed: queue(failure('Mock token request failed: Unknown or expired code.')) },
    });
    runs.push(run);

    expect(run.status).toBe('waiting');
    expect(run.place).toBe('auth_failed');
    expect(run.raw.availableTransitions.map((t) => t.id)).toEqual(['retryAuth']);
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(1);
  });

  it('starts over after a retry', async () => {
    const { oAuthWorkflow, providers } = setup([undefined, 'valid']);

    const run = await runWorkflow(CustomOAuthProviderExampleWorkflow, undefined, {
      providers,
      answers: { authFailed: queue(failure('Mock token request failed.')), retryAuth: queue({}) },
    });
    runs.push(run);

    expect(run.status).toBe('completed');
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(1);
  });

  it('covers every transition and park (coverage gate)', () => {
    const cov = coverage(runs, CustomOAuthProviderExampleWorkflow);
    expect(cov.missingTransitions).toEqual([]);
    expect(cov.missingParks).toEqual([]);
  });
});
