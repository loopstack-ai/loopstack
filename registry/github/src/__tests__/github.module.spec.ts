import { describe, expect, it } from 'vitest';
import { getBlockName, getBlockTypeFromMetadata } from '@loopstack/common';
import { OAuthModule } from '@loopstack/oauth';
import { GitHubOAuthProvider } from '../github-oauth.provider.js';
import { GitHubModule } from '../github.module.js';
import * as packageExports from '../index.js';
import { GITHUB_TOKEN_PROVIDER, OAuthGitHubTokenProvider } from '../token/index.js';

type Provider = abstract new (...args: never[]) => unknown;

const providers = Reflect.getMetadata('providers', GitHubModule) as (Provider | { provide: unknown })[];
const classes = providers.filter((provider): provider is Provider => typeof provider === 'function');
const tools = classes.filter((provider) => provider !== GitHubOAuthProvider && provider !== OAuthGitHubTokenProvider);

describe('GitHubModule', () => {
  it('imports the OAuth module', () => {
    expect(Reflect.getMetadata('imports', GitHubModule)).toEqual([OAuthModule]);
  });

  it('provides the OAuth provider, the default token provider and 36 tools', () => {
    expect(classes).toContain(GitHubOAuthProvider);
    expect(providers).toContainEqual({ provide: GITHUB_TOKEN_PROVIDER, useClass: OAuthGitHubTokenProvider });
    expect(tools).toHaveLength(36);
    expect(new Set(classes).size).toBe(classes.length);
  });

  it('exports every tool and the token provider', () => {
    const exported = Reflect.getMetadata('exports', GitHubModule) as unknown[];
    expect(exported).toContain(GitHubOAuthProvider);
    expect(exported).toContain(GITHUB_TOKEN_PROVIDER);
    for (const tool of tools) expect(exported, tool.name).toContain(tool);
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

  it('exposes every tool from the package entry point', () => {
    const exported = Object.values(packageExports);
    for (const provider of classes) {
      expect(exported, provider.name).toContain(provider);
    }
  });

  // An app with no signed-in user authenticates the same tools with a token of its own.
  it('forRoot replaces the token provider and still exports the tools', () => {
    class AppTokenProvider {
      async getToken(): Promise<string | null> {
        return 'app-token';
      }
    }
    const dynamic = GitHubModule.forRoot({
      tokenProvider: { provide: GITHUB_TOKEN_PROVIDER, useClass: AppTokenProvider },
    });

    expect(dynamic.module).toBe(GitHubModule);
    expect(dynamic.providers).toEqual([{ provide: GITHUB_TOKEN_PROVIDER, useClass: AppTokenProvider }]);
    expect(dynamic.exports).toContain(GITHUB_TOKEN_PROVIDER);
    for (const tool of tools) expect(dynamic.exports, tool.name).toContain(tool);
  });
});
