import { describe, expect, it } from 'vitest';
import { getBlockName, getBlockTypeFromMetadata } from '@loopstack/common';
import { OAuthModule } from '@loopstack/oauth-module';
import { GitHubOAuthProvider } from '../github-oauth.provider.js';
import { GitHubModule } from '../github.module.js';
import * as packageExports from '../index.js';

type Provider = abstract new (...args: never[]) => unknown;

const providers = Reflect.getMetadata('providers', GitHubModule) as Provider[];
const tools = providers.filter((provider) => provider !== GitHubOAuthProvider);

describe('GitHubModule', () => {
  it('imports the OAuth module', () => {
    expect(Reflect.getMetadata('imports', GitHubModule)).toEqual([OAuthModule]);
  });

  it('provides the OAuth provider and 25 tools', () => {
    expect(providers).toContain(GitHubOAuthProvider);
    expect(tools).toHaveLength(25);
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

  it('exposes every tool from the package entry point', () => {
    const exported = Object.values(packageExports);
    for (const provider of providers) {
      expect(exported, provider.name).toContain(provider);
    }
  });
});
