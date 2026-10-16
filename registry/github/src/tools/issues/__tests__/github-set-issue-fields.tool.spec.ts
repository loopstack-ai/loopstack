import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_PIPELINE, getBlockArgsSchema } from '@loopstack/common';
import type { ToolPipeline } from '@loopstack/common';
import { createToolTest } from '@loopstack/testing';
import { GITHUB_TOKEN_PROVIDER } from '../../../token/index.js';
import { GitHubSetIssueFieldsArgs, GitHubSetIssueFieldsTool } from '../github-set-issue-fields.tool.js';

const HEADERS = {
  Authorization: 'Bearer gh-token',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const GRAPHQL_URL = 'https://api.github.com/graphql';
const VALUES_URL = 'https://api.github.com/repos/octo/hello/issues/7/issue-field-values';

const args = { owner: 'octo', repo: 'hello', issueNumber: 7, fields: { Priority: 'P1' } };

/** The repository's field definitions, as the GraphQL lookup returns them. */
const fieldDefinitions = () =>
  Response.json(
    {
      data: {
        repository: {
          issueFields: {
            nodes: [
              { fullDatabaseId: '101', name: 'Priority', options: [{ name: 'P0' }, { name: 'P1' }] },
              { fullDatabaseId: '102', name: 'Notes' },
            ],
          },
        },
      },
    },
    { status: 200 },
  );

describe('GitHubSetIssueFieldsTool', () => {
  let module: TestingModule;
  let tool: GitHubSetIssueFieldsTool;

  const mockTokenProvider = {
    getToken: vi.fn(),
  };
  const fetchMock = vi.fn();

  const execute = (input: GitHubSetIssueFieldsArgs) => module.get<ToolPipeline>(TOOL_PIPELINE).execute(tool, input);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    mockTokenProvider.getToken.mockResolvedValue('gh-token');

    module = await createToolTest()
      .forTool(GitHubSetIssueFieldsTool)
      .withMock(GITHUB_TOKEN_PROVIDER, mockTokenProvider)
      .compile();

    tool = module.get(GitHubSetIssueFieldsTool);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await module.close();
  });

  describe('validation', () => {
    it('requires owner, repo, issueNumber and fields', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ owner: 'octo', repo: 'hello', issueNumber: 7 })).toThrow();
      expect(() => schema.parse(args)).not.toThrow();
    });

    it('rejects extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(tool)!;
      expect(() => schema.parse({ ...args, extra: true })).toThrow();
    });
  });

  describe('execution', () => {
    it('looks the field ids up before writing the values', async () => {
      fetchMock.mockResolvedValueOnce(fieldDefinitions()).mockResolvedValueOnce(Response.json({}, { status: 200 }));

      const result = await tool.call(args);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe(GRAPHQL_URL);
      expect(fetchMock.mock.calls[1][0]).toBe(VALUES_URL);
      expect(fetchMock.mock.calls[1][1]).toEqual({
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ issue_field_values: [{ field_id: 101, value: 'P1' }] }),
      });
      expect(result.data).toEqual({ issueNumber: 7, fields: ['Priority'] });
    });

    it('sets a field without options by name as well', async () => {
      fetchMock.mockResolvedValueOnce(fieldDefinitions()).mockResolvedValueOnce(Response.json({}, { status: 200 }));

      const result = await execute({ ...args, fields: { Notes: 'needs review' } });

      expect(fetchMock.mock.calls[1][1].body).toBe(
        JSON.stringify({ issue_field_values: [{ field_id: 102, value: 'needs review' }] }),
      );
      expect(result.data).toEqual({ issueNumber: 7, fields: ['Notes'] });
    });

    it('does nothing when no field is named', async () => {
      const result = await execute({ ...args, fields: {} });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({ issueNumber: 7, fields: [] });
    });

    it('fails naming a field the repository does not offer', async () => {
      fetchMock.mockResolvedValueOnce(fieldDefinitions());

      const result = await execute({ ...args, fields: { Effort: 'M' } });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({
        error: 'unknown_field',
        message: 'octo/hello has no issue field "Effort".',
      });
      expect(result.error).toBe('octo/hello has no issue field "Effort".');
    });

    it('fails naming an option the field does not define, listing the ones it has', async () => {
      fetchMock.mockResolvedValueOnce(fieldDefinitions());

      const result = await execute({ ...args, fields: { Priority: 'P9' } });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({
        error: 'unknown_option',
        message: 'The issue field "Priority" on octo/hello has no option "P9" (it has P0, P1).',
      });
      expect(result.error).toBe('The issue field "Priority" on octo/hello has no option "P9" (it has P0, P1).');
    });

    it('reports a GraphQL error from the lookup', async () => {
      fetchMock.mockResolvedValueOnce(
        Response.json({ errors: [{ message: 'Field issueFields does not exist' }] }, { status: 200 }),
      );

      const result = await execute(args);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({
        error: 'api_error',
        message: 'GitHub GraphQL query failed: Field issueFields does not exist',
      });
    });

    it('returns unauthorized without calling the API when the provider has no token', async () => {
      mockTokenProvider.getToken.mockResolvedValue(null);

      const result = await execute(args);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.data).toEqual({
        error: 'unauthorized',
        message: 'No valid GitHub token found. Please authenticate first.',
      });
      expect(result.error).toBe('No valid GitHub token found. Please authenticate first.');
    });

    it.each([401, 403])('reports a rejected token when the lookup answers HTTP %i', async (status) => {
      fetchMock.mockResolvedValueOnce(new Response('denied', { status }));

      const result = await execute(args);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it.each([401, 403])('reports a rejected token when the write answers HTTP %i', async (status) => {
      fetchMock.mockResolvedValueOnce(fieldDefinitions()).mockResolvedValueOnce(new Response('denied', { status }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: '401', message: 'GitHub token was rejected. Please re-authenticate.' });
      expect(result.error).toBe('GitHub token was rejected. Please re-authenticate.');
    });

    it('reports other API failures as api_error', async () => {
      fetchMock
        .mockResolvedValueOnce(fieldDefinitions())
        .mockResolvedValueOnce(new Response('missing', { status: 404, statusText: 'Not Found' }));

      const result = await execute(args);

      expect(result.data).toEqual({ error: 'api_error', message: 'GitHub API error: Not Found' });
      expect(result.error).toBe('GitHub API error: Not Found');
    });

    it('URL-encodes owner and repo in the write URL', async () => {
      fetchMock.mockResolvedValueOnce(fieldDefinitions()).mockResolvedValueOnce(Response.json({}, { status: 200 }));

      await execute({ ...args, owner: 'a/b', repo: 'c d' });

      expect(fetchMock.mock.calls[1][0]).toBe('https://api.github.com/repos/a%2Fb/c%20d/issues/7/issue-field-values');
    });
  });
});
