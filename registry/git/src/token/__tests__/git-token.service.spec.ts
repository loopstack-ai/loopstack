import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunContext } from '@loopstack/common';
import type { OAuthTokenStore } from '@loopstack/oauth';
import type { SecretService } from '@loopstack/secrets';
import { GitTokenService, type GitToolConfig } from '../git-token.service.js';

const ctx = { userId: 'u1', workspaceId: 'w1' } as RunContext;

describe('GitTokenService', () => {
  let env: Record<string, string | undefined>;
  let secrets: { resolveEnvMap: ReturnType<typeof vi.fn> };
  let oauth: { getValidAccessToken: ReturnType<typeof vi.fn> };

  const service = (moduleSource?: GitToolConfig) =>
    new GitTokenService(
      { get: (name: string) => env[name] } as unknown as ConfigService,
      secrets as unknown as SecretService,
      oauth as unknown as OAuthTokenStore,
      moduleSource,
    );

  beforeEach(() => {
    env = { GIT_TOKEN: 'from-the-app', PUBLISH_TOKEN: 'from-the-call' };
    secrets = { resolveEnvMap: vi.fn().mockResolvedValue({ GITHUB_TOKEN: 'from-the-workspace' }) };
    oauth = { getValidAccessToken: vi.fn().mockResolvedValue('from-oauth') };
  });

  it('reads the variable the call names, which outranks the one the module names', async () => {
    await expect(
      service({ tokenEnv: 'GIT_TOKEN' }).resolve(ctx, { config: { tokenEnv: 'PUBLISH_TOKEN' } }),
    ).resolves.toBe('from-the-call');
    expect(secrets.resolveEnvMap).not.toHaveBeenCalled();
    expect(oauth.getValidAccessToken).not.toHaveBeenCalled();
  });

  it('reads the variable the module names when the call names no source', async () => {
    await expect(service({ tokenEnv: 'GIT_TOKEN' }).resolve(ctx)).resolves.toBe('from-the-app');
  });

  // A named source is what the app declared, so an empty one is an answer rather than a reason to look further.
  it('answers undefined for a named variable that is not set, without falling back', async () => {
    await expect(service({ tokenEnv: 'MISSING' }).resolve(ctx)).resolves.toBeUndefined();
    expect(oauth.getValidAccessToken).not.toHaveBeenCalled();
  });

  it("reads the workspace secret the call names, from the run's workspace", async () => {
    await expect(service().resolve(ctx, { config: { tokenSecret: 'GITHUB_TOKEN' } })).resolves.toBe(
      'from-the-workspace',
    );
    expect(secrets.resolveEnvMap).toHaveBeenCalledWith('w1');
  });

  it("reads the OAuth token of the run's user for the provider the call names", async () => {
    await expect(service().resolve(ctx, { config: { oauthProvider: 'github' } })).resolves.toBe('from-oauth');
    expect(oauth.getValidAccessToken).toHaveBeenCalledWith('u1', 'github');
  });

  // An environment variable outranks a secret, which outranks OAuth, whichever of them the module contributed.
  it('takes the first source in order when several are named', async () => {
    const source = { tokenEnv: 'GIT_TOKEN', tokenSecret: 'GITHUB_TOKEN', oauthProvider: 'github' };

    await expect(service(source).resolve(ctx)).resolves.toBe('from-the-app');
    await expect(service({ tokenSecret: 'GITHUB_TOKEN', oauthProvider: 'github' }).resolve(ctx)).resolves.toBe(
      'from-the-workspace',
    );
  });

  // No source named means the command runs unauthenticated, which is all a public remote needs.
  it('answers undefined when nothing names a source', async () => {
    await expect(service().resolve(ctx)).resolves.toBeUndefined();
    expect(secrets.resolveEnvMap).not.toHaveBeenCalled();
    expect(oauth.getValidAccessToken).not.toHaveBeenCalled();
  });

  it('says which module is missing when a source needs one that is not imported', async () => {
    const bare = new GitTokenService({ get: () => undefined } as unknown as ConfigService);

    await expect(bare.resolve(ctx, { config: { tokenSecret: 'GITHUB_TOKEN' } })).rejects.toThrow('SecretsModule');
    await expect(bare.resolve(ctx, { config: { oauthProvider: 'github' } })).rejects.toThrow('OAuthModule');
  });
});
