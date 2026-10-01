import type { Type } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseWorkflow } from '@loopstack/common';
import { createToolMock, runWorkflow } from '@loopstack/testing';
import type { ToolMock } from '@loopstack/testing';
import { OAuthSessionService } from '../../services/index.js';
import { BuildOAuthUrlTool, ExchangeOAuthTokenTool } from '../../tools/index.js';
import { OAuthWorkflow } from '../oauth.workflow.js';

// `OAuthArgs` is an interface, so the class does not satisfy runWorkflow's `BaseWorkflow<Record<string, unknown>>` bound.
const workflowClass = OAuthWorkflow as unknown as Type<BaseWorkflow>;

describe('OAuthWorkflow', () => {
  let buildOAuthUrl: ToolMock;
  let exchangeOAuthToken: ToolMock;
  const sessions = { register: vi.fn() };

  const run = (answers?: Record<string, unknown>) =>
    runWorkflow(
      workflowClass,
      { provider: 'acme', scopes: ['repo'] },
      {
        providers: [
          { provide: BuildOAuthUrlTool, useValue: buildOAuthUrl },
          { provide: ExchangeOAuthTokenTool, useValue: exchangeOAuthToken },
          { provide: OAuthSessionService, useValue: sessions },
        ],
        answers,
      },
    );

  beforeEach(() => {
    vi.clearAllMocks();
    buildOAuthUrl = createToolMock('BuildOAuthUrlTool');
    exchangeOAuthToken = createToolMock('ExchangeOAuthTokenTool');
    buildOAuthUrl.call.mockResolvedValue({ data: { authUrl: 'https://acme.test/auth', state: 'state-1' } });
    exchangeOAuthToken.call.mockResolvedValue({ data: { accessToken: 'at-1' } });
    sessions.register.mockResolvedValue(undefined);
  });

  it('registers the session, renders a pending prompt and waits for the callback', async () => {
    const result = await run();

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('waiting');
    expect(result.place).toBe('awaiting_auth');
    expect(buildOAuthUrl.call).toHaveBeenCalledWith({ provider: 'acme', scopes: ['repo'] });
    expect(sessions.register).toHaveBeenCalledWith(
      'state-1',
      expect.objectContaining({ userId: 'test-user', provider: 'acme' }),
    );
    expect(result.document('oauthPrompt')).toEqual({
      provider: 'acme',
      authUrl: 'https://acme.test/auth',
      state: 'state-1',
      status: 'pending',
    });
    expect(exchangeOAuthToken.call).not.toHaveBeenCalled();
  });

  it('exchanges the code on callback, marks the prompt successful and completes', async () => {
    const result = await run({ exchangeToken: { code: 'auth-code', state: 'state-1' } });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe('completed');
    expect(result.place).toBe('end');
    expect(result.path).toEqual(['initiateOAuth', 'exchangeToken']);
    expect(exchangeOAuthToken.call).toHaveBeenCalledWith({
      provider: 'acme',
      code: 'auth-code',
      state: 'state-1',
      expectedState: 'state-1',
    });
    expect(result.result).toEqual({ authenticated: true });
    expect(result.document('oauthPrompt')).toEqual({
      provider: 'acme',
      authUrl: 'https://acme.test/auth',
      state: 'state-1',
      status: 'success',
      message: 'Successfully connected.',
    });
  });

  it('fails without marking the prompt successful when the token exchange fails', async () => {
    exchangeOAuthToken.call.mockRejectedValue(new Error('OAuth state mismatch. Possible CSRF attack.'));

    const result = await run({ exchangeToken: { code: 'auth-code', state: 'forged' } });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('OAuth state mismatch');
    expect(result.document('oauthPrompt')).toMatchObject({ status: 'pending' });
  });

  it('fails when the auth URL cannot be built', async () => {
    buildOAuthUrl.call.mockRejectedValue(new Error('OAuth provider "acme" is not registered.'));

    const result = await run();

    expect(result.status).toBe('failed');
    expect(result.error).toContain('is not registered');
    expect(sessions.register).not.toHaveBeenCalled();
  });

  it('rejects invalid args', async () => {
    await expect(runWorkflow(workflowClass, { scopes: [] })).rejects.toThrow();
  });
});
