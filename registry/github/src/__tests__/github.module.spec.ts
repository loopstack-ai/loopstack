import { describe, expect, it } from 'vitest';
import { getBlockName, getBlockTypeFromMetadata } from '@loopstack/common';
import { OAuthModule } from '@loopstack/oauth';
import { GitHubOAuthProvider } from '../github-oauth.provider.js';
import { GitHubModule } from '../github.module.js';
import * as packageExports from '../index.js';
import { GITHUB_TOKEN_ENV, GitHubTokenService } from '../token/index.js';

type Provider = abstract new (...args: never[]) => unknown;

const providers = Reflect.getMetadata('providers', GitHubModule) as Provider[];
const tools = providers.filter((provider) => provider !== GitHubOAuthProvider && provider !== GitHubTokenService);

describe('GitHubModule', () => {
  it('imports the OAuth module', () => {
    expect(Reflect.getMetadata('imports', GitHubModule)).toEqual([OAuthModule]);
  });

  it('provides the OAuth provider, the token service and 36 tools', () => {
    expect(providers).toContain(GitHubOAuthProvider);
    expect(providers).toContain(GitHubTokenService);
    expect(tools).toHaveLength(36);
    expect(new Set(providers).size).toBe(providers.length);
  });

  it('exports everything it provides', () => {
    expect(Reflect.getMetadata('exports', GitHubModule)).toEqual(providers);
  });

  it('registers only @Tool classes with unique github_ names', () => {
    for (const tool of tools) {
      expect(getBlockTypeFromMetadata(tool), tool.name).toBe('tool');
    }

    const names = tools.map((tool) => getBlockName(tool));
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^github_[a-z_]+$/);
    }
  });

  it('exposes every provider from the package entry point', () => {
    const exported = Object.values(packageExports);
    for (const provider of providers) {
      expect(exported, provider.name).toContain(provider);
    }
  });

  // An app with no signed-in user names the environment variable its token lives in.
  it('forRoot names the token variable and still exports the tools', () => {
    const dynamic = GitHubModule.forRoot({ tokenEnv: 'GITHUB_TOKEN' });

    expect(dynamic.module).toBe(GitHubModule);
    expect(dynamic.providers).toEqual([{ provide: GITHUB_TOKEN_ENV, useValue: 'GITHUB_TOKEN' }]);
    expect(dynamic.exports).toContain(GitHubTokenService);
    for (const tool of tools) expect(dynamic.exports, tool.name).toContain(tool);
  });
});
