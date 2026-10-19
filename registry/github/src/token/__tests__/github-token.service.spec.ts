import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunContext } from '@loopstack/common';
import type { OAuthTokenStore } from '@loopstack/oauth';
import { GitHubTokenService } from '../github-token.service.js';

const ctx = { userId: 'u1' } as RunContext;

describe('GitHubTokenService', () => {
  let env: Record<string, string | undefined>;
  let oauth: { getValidAccessToken: ReturnType<typeof vi.fn> };

  const service = (moduleTokenEnv?: string) =>
    new GitHubTokenService(
      { get: (name: string) => env[name] } as unknown as ConfigService,
      oauth as unknown as OAuthTokenStore,
      moduleTokenEnv,
    );

  beforeEach(() => {
    env = { GITHUB_TOKEN: 'from-the-app', GITHUB_APP_PUBLISH_TOKEN: 'from-the-call' };
    oauth = { getValidAccessToken: vi.fn().mockResolvedValue('from-oauth') };
  });

  it('reads the variable the call names, which outranks the one the module names', async () => {
    await expect(
      service('GITHUB_TOKEN').resolve(ctx, { config: { tokenEnv: 'GITHUB_APP_PUBLISH_TOKEN' } }),
    ).resolves.toBe('from-the-call');
    expect(oauth.getValidAccessToken).not.toHaveBeenCalled();
  });

  it('reads the variable the module names when the call names none', async () => {
    await expect(service('GITHUB_TOKEN').resolve(ctx)).resolves.toBe('from-the-app');
  });

  // A named variable is the app's declared source, so an empty one is an answer, not a reason to ask elsewhere.
  it('answers null for a named variable that is not set, without falling back', async () => {
    await expect(service('MISSING_TOKEN').resolve(ctx)).resolves.toBeNull();
    expect(oauth.getValidAccessToken).not.toHaveBeenCalled();
  });

  it("falls back to the OAuth token of the run's user when no variable is named", async () => {
    await expect(service().resolve(ctx)).resolves.toBe('from-oauth');
    expect(oauth.getValidAccessToken).toHaveBeenCalledWith('u1', 'github');
  });

  it('answers null when the user never authenticated', async () => {
    oauth.getValidAccessToken.mockResolvedValue(undefined);

    await expect(service().resolve(ctx)).resolves.toBeNull();
  });
});
