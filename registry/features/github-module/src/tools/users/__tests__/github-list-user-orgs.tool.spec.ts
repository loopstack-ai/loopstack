import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { OAuthTokenStore } from '@loopstack/oauth-module';
import { createToolTest } from '@loopstack/testing';
import { GitHubListUserOrgsArgs, GitHubListUserOrgsTool } from '../github-list-user-orgs.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GitHubListUserOrgsTool', () => {
  let module: TestingModule;
  let tool: GitHubListUserOrgsTool;

  const mockTokenStore = {
    getValidAccessToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (args: GitHubListUserOrgsArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, args);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenStore.getValidAccessToken.mockResolvedValue('gh-token');

    module = await createToolTest().forTool(GitHubListUserOrgsTool).withMock(OAuthTokenStore, mockTokenStore).compile();

    tool = module.get(GitHubListUserOrgsTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('defaults perPage', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(schema.parse({})).toEqual({ perPage: 30 });
      expect(() => schema.parse({ perPage: '10' })).toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('lists organizations with the default page size and maps the response', async () => {
      fetchMock.mockResolvedValue(
        Response.json([
          {
            id: 100,
            login: 'acme',
            description: 'Acme Corp',
            avatar_url: 'https://avatars.githubusercontent.com/u/100',
            url: 'https://api.github.com/orgs/acme',
          },
          {
            id: 101,
            login: 'side-project',
            description: null,
            avatar_url: 'https://avatars.githubusercontent.com/u/101',
            url: 'https://api.github.com/orgs/side-project',
          },
        ]),
      );

      const result = await tool.call({});

      expect(mockTokenStore.getValidAccessToken).toHaveBeenCalledWith('test-user', 'github');
      expect(fetchMock).toHaveBeenCalledWith('https://api.github.com/user/orgs?per_page=30', { headers: HEADERS });
      expect(result.data).toEqual({
        orgs: [
          {
            id: 100,
            login: 'acme',
            description: 'Acme Corp',
            avatarUrl: 'https://avatars.githubusercontent.com/u/100',
          },
          {
            id: 101,
            login: 'side-project',
            description: null,
            avatarUrl: 'https://avatars.githubusercontent.com/u/101',
          },
        ],
      });
    });

    it('passes perPage', async () => {
      fetchMock.mockResolvedValue(Response.json([]));

      const result = await tool.call({ perPage: 100 });

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/user/orgs?per_page=100');
      expect(result.data).toEqual({ orgs: [] });
    });

    it('returns unauthorized without calling the API when no token is available', async () => {
      mockTokenStore.getValidAccessToken.mockResolvedValue(undefined);

      const result = await execute({});

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token on HTTP %i', async (status) => {
      fetchMock.mockResolvedValue(new Response('denied', { status }));

      const result = await execute({});

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock.mockResolvedValue(new Response('boom', { status: 500, statusText: 'Internal Server Error' }));

      const result = await execute({});

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Internal Server Error' });
      expect(result.error).toBe('GitHub API error: Internal Server Error');
    });
  });
});
