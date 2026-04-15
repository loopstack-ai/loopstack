import { TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import { RunContext, WorkflowEntity, getBlockArgsSchema, getBlockConfig, getBlockTools } from '@loopstack/common';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import {
  GitHubCreateIssueCommentTool,
  GitHubCreateIssueTool,
  GitHubCreateOrUpdateFileTool,
  GitHubCreatePullRequestTool,
  GitHubCreateRepoTool,
  GitHubGetAuthenticatedUserTool,
  GitHubGetCommitTool,
  GitHubGetFileContentTool,
  GitHubGetIssueTool,
  GitHubGetPullRequestTool,
  GitHubGetRepoTool,
  GitHubGetWorkflowRunTool,
  GitHubListBranchesTool,
  GitHubListDirectoryTool,
  GitHubListIssuesTool,
  GitHubListPrReviewsTool,
  GitHubListPullRequestsTool,
  GitHubListReposTool,
  GitHubListUserOrgsTool,
  GitHubListWorkflowRunsTool,
  GitHubMergePullRequestTool,
  GitHubSearchCodeTool,
  GitHubSearchIssuesTool,
  GitHubSearchReposTool,
  GitHubTriggerWorkflowTool,
} from '@loopstack/github-module';
import { OAuthModule, OAuthWorkflow } from '@loopstack/oauth-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { GitHubReposOverviewWorkflow } from '../github-repos-overview.workflow';

const mockOAuthWorkflow = {
  run: jest.fn(),
};

function applyAllGitHubToolMocks(builder: ReturnType<typeof createWorkflowTest>) {
  return builder
    .withToolMock(GitHubGetAuthenticatedUserTool)
    .withToolMock(GitHubListUserOrgsTool)
    .withToolMock(GitHubListReposTool)
    .withToolMock(GitHubGetRepoTool)
    .withToolMock(GitHubCreateRepoTool)
    .withToolMock(GitHubListBranchesTool)
    .withToolMock(GitHubListIssuesTool)
    .withToolMock(GitHubGetIssueTool)
    .withToolMock(GitHubCreateIssueTool)
    .withToolMock(GitHubCreateIssueCommentTool)
    .withToolMock(GitHubListPullRequestsTool)
    .withToolMock(GitHubGetPullRequestTool)
    .withToolMock(GitHubCreatePullRequestTool)
    .withToolMock(GitHubMergePullRequestTool)
    .withToolMock(GitHubListPrReviewsTool)
    .withToolMock(GitHubGetFileContentTool)
    .withToolMock(GitHubCreateOrUpdateFileTool)
    .withToolMock(GitHubListDirectoryTool)
    .withToolMock(GitHubGetCommitTool)
    .withToolMock(GitHubListWorkflowRunsTool)
    .withToolMock(GitHubTriggerWorkflowTool)
    .withToolMock(GitHubGetWorkflowRunTool)
    .withToolMock(GitHubSearchCodeTool)
    .withToolMock(GitHubSearchReposTool)
    .withToolMock(GitHubSearchIssuesTool);
}

function buildWorkflowTest() {
  return applyAllGitHubToolMocks(
    createWorkflowTest()
      .forWorkflow(GitHubReposOverviewWorkflow)
      .withImports(LoopCoreModule, OAuthModule)
      .withMock(OAuthWorkflow, mockOAuthWorkflow),
  );
}

describe('GitHubReposOverviewWorkflow', () => {
  let module: TestingModule;
  let workflow: GitHubReposOverviewWorkflow;
  let processor: WorkflowProcessorService;

  let mockGetAuthenticatedUser: ToolMock;
  let mockListUserOrgs: ToolMock;
  let mockGetRepo: ToolMock;
  let mockListBranches: ToolMock;
  let mockListIssues: ToolMock;
  let mockListPullRequests: ToolMock;
  let mockListDirectory: ToolMock;
  let mockListWorkflowRuns: ToolMock;
  let mockSearchCode: ToolMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await buildWorkflowTest().compile();

    workflow = module.get(GitHubReposOverviewWorkflow);
    processor = module.get(WorkflowProcessorService);

    mockGetAuthenticatedUser = module.get(GitHubGetAuthenticatedUserTool);
    mockListUserOrgs = module.get(GitHubListUserOrgsTool);
    mockGetRepo = module.get(GitHubGetRepoTool);
    mockListBranches = module.get(GitHubListBranchesTool);
    mockListIssues = module.get(GitHubListIssuesTool);
    mockListPullRequests = module.get(GitHubListPullRequestsTool);
    mockListDirectory = module.get(GitHubListDirectoryTool);
    mockListWorkflowRuns = module.get(GitHubListWorkflowRunsTool);
    mockSearchCode = module.get(GitHubSearchCodeTool);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });

    it('should have argsSchema defined', () => {
      expect(getBlockArgsSchema(workflow)).toBeDefined();
      expect(getBlockArgsSchema(workflow)).toBeInstanceOf(z.ZodType);
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have GitHub tools available', () => {
      const tools = getBlockTools(workflow);
      expect(tools).toBeDefined();

      expect(tools).toContain('gitHubGetAuthenticatedUser');
      expect(tools).toContain('gitHubListUserOrgs');
      expect(tools).toContain('gitHubGetRepo');

      expect(tools).toContain('gitHubListBranches');
      expect(tools).toContain('gitHubListIssues');
      expect(tools).toContain('gitHubListPullRequests');
      expect(tools).toContain('gitHubListDirectory');
      expect(tools).toContain('gitHubListWorkflowRuns');
      expect(tools).toContain('gitHubSearchCode');
    });
  });

  describe('arguments', () => {
    it('should validate arguments with owner and repo', () => {
      const schema = getBlockArgsSchema(workflow)!;
      const result = schema.parse({ owner: 'octocat', repo: 'Hello-World' });
      expect(result).toEqual({ owner: 'octocat', repo: 'Hello-World' });
    });

    it('should apply default owner when missing', () => {
      const schema = getBlockArgsSchema(workflow)!;
      const result = schema.parse({ repo: 'Hello-World' });
      expect(result).toEqual({ owner: 'octocat', repo: 'Hello-World' });
    });

    it('should apply default repo when missing', () => {
      const schema = getBlockArgsSchema(workflow)!;
      const result = schema.parse({ owner: 'myuser' });
      expect(result).toEqual({ owner: 'myuser', repo: 'Hello-World' });
    });

    it('should apply all defaults when empty', () => {
      const schema = getBlockArgsSchema(workflow)!;
      const result = schema.parse({});
      expect(result).toEqual({ owner: 'octocat', repo: 'Hello-World' });
    });

    it('should reject extra properties (strict mode)', () => {
      const schema = getBlockArgsSchema(workflow)!;
      expect(() => schema.parse({ owner: 'octocat', repo: 'Hello-World', extra: 'nope' })).toThrow();
    });
  });

  describe('workflow execution — happy path', () => {
    const args = { owner: 'octocat', repo: 'Hello-World' };

    function setupAllMocks() {
      mockGetAuthenticatedUser.call.mockResolvedValue({
        data: {
          user: {
            id: 1,
            login: 'octocat',
            name: 'The Octocat',
            email: null,
            avatarUrl: '',
            htmlUrl: 'https://github.com/octocat',
            bio: null,
            publicRepos: 8,
            followers: 100,
            following: 0,
            createdAt: '2011-01-25T00:00:00Z',
          },
        },
      });

      mockListUserOrgs.call.mockResolvedValue({
        data: {
          orgs: [{ id: 1, login: 'github', description: 'How people build software', avatarUrl: '' }],
        },
      });

      mockGetRepo.call.mockResolvedValue({
        data: {
          repo: {
            id: 1296269,
            fullName: 'octocat/Hello-World',
            name: 'Hello-World',
            owner: 'octocat',
            ownerAvatar: '',
            private: false,
            htmlUrl: 'https://github.com/octocat/Hello-World',
            description: 'My first repository on GitHub!',
            language: 'JavaScript',
            defaultBranch: 'main',
            stars: 2500,
            forks: 1800,
            openIssues: 42,
            createdAt: '2011-01-26T00:00:00Z',
            updatedAt: '2025-01-15T00:00:00Z',
            topics: [],
            license: 'MIT',
          },
        },
      });

      mockListBranches.call.mockResolvedValue({
        data: {
          branches: [
            { name: 'main', commitSha: 'abc123', protected: true },
            { name: 'develop', commitSha: 'def456', protected: false },
          ],
        },
      });

      mockListIssues.call.mockResolvedValue({
        data: {
          issues: [
            {
              id: 1,
              number: 42,
              title: 'Found a bug',
              state: 'open',
              user: 'octocat',
              labels: ['bug'],
              assignees: [],
              createdAt: '2025-01-10T00:00:00Z',
              updatedAt: '2025-01-10T00:00:00Z',
              htmlUrl: 'https://github.com/octocat/Hello-World/issues/42',
              isPullRequest: false,
            },
          ],
        },
      });

      mockListPullRequests.call.mockResolvedValue({
        data: {
          pullRequests: [
            {
              id: 1,
              number: 10,
              title: 'Add feature',
              state: 'open',
              user: 'octocat',
              head: 'feature',
              headSha: 'abc',
              base: 'main',
              createdAt: '2025-01-12T00:00:00Z',
              updatedAt: '2025-01-12T00:00:00Z',
              htmlUrl: 'https://github.com/octocat/Hello-World/pull/10',
              draft: false,
            },
          ],
        },
      });

      mockListDirectory.call.mockResolvedValue({
        data: {
          entries: [
            { name: 'README.md', path: 'README.md', sha: 'abc', size: 1234, type: 'file', htmlUrl: '' },
            { name: 'src', path: 'src', sha: 'def', size: 0, type: 'dir', htmlUrl: '' },
          ],
        },
      });

      mockListWorkflowRuns.call.mockResolvedValue({
        data: {
          totalCount: 1,
          runs: [
            {
              id: 100,
              name: 'CI',
              status: 'completed',
              conclusion: 'success',
              headBranch: 'main',
              headSha: 'abc',
              event: 'push',
              createdAt: '2025-01-14T00:00:00Z',
              updatedAt: '2025-01-14T00:00:00Z',
              htmlUrl: 'https://github.com/octocat/Hello-World/actions/runs/100',
            },
          ],
        },
      });

      mockSearchCode.call.mockResolvedValue({
        data: {
          totalCount: 1,
          results: [
            { name: 'index.js', path: 'src/index.js', sha: 'xyz', htmlUrl: '', repository: 'octocat/Hello-World' },
          ],
        },
      });
    }

    it('should execute full workflow from start to end', async () => {
      const context = createStatelessContext();
      setupAllMocks();

      const result = await processor.process(workflow, args, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');

      // Verify markdown document was created
      expect(result.documents).toEqual(
        expect.arrayContaining([expect.objectContaining({ className: 'MarkdownDocument' })]),
      );

      // Verify all read tools were called
      expect(mockGetAuthenticatedUser.call).toHaveBeenCalledTimes(1);
      expect(mockListUserOrgs.call).toHaveBeenCalledTimes(1);
      expect(mockGetRepo.call).toHaveBeenCalledTimes(1);
      expect(mockListBranches.call).toHaveBeenCalledTimes(1);
      expect(mockListIssues.call).toHaveBeenCalledTimes(1);
      expect(mockListPullRequests.call).toHaveBeenCalledTimes(1);
      expect(mockListDirectory.call).toHaveBeenCalledTimes(1);
      expect(mockListWorkflowRuns.call).toHaveBeenCalledTimes(1);
      expect(mockSearchCode.call).toHaveBeenCalledTimes(1);
    });

    it('should pass owner and repo to gitHubGetRepo', async () => {
      const context = createStatelessContext();
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockGetRepo.call).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World' }),
        undefined,
      );
    });

    it('should pass owner and repo to gitHubListBranches', async () => {
      const context = createStatelessContext();
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListBranches.call).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World' }),
        undefined,
      );
    });

    it('should pass owner and repo to gitHubListIssues with state open', async () => {
      const context = createStatelessContext();
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListIssues.call).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World', state: 'open' }),
        undefined,
      );
    });

    it('should pass owner and repo to gitHubListPullRequests', async () => {
      const context = createStatelessContext();
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListPullRequests.call).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World', state: 'open' }),
        undefined,
      );
    });

    it('should pass owner and repo to gitHubListDirectory', async () => {
      const context = createStatelessContext();
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListDirectory.call).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World' }),
        undefined,
      );
    });

    it('should pass owner and repo to gitHubListWorkflowRuns', async () => {
      const context = createStatelessContext();
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListWorkflowRuns.call).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World' }),
        undefined,
      );
    });

    it('should pass repo-scoped query to gitHubSearchCode', async () => {
      const context = createStatelessContext();
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockSearchCode.call).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'repo:octocat/Hello-World' }),
        undefined,
      );
    });
  });

  describe('workflow execution — auth flow', () => {
    it('should stop at awaiting_auth when unauthorized', async () => {
      const context = createStatelessContext();

      mockGetAuthenticatedUser.call.mockResolvedValue({
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      });

      mockOAuthWorkflow.run.mockResolvedValue({
        workflowId: 'test-workflow-id',
      });

      const result = await processor.process(workflow, { owner: 'octocat', repo: 'Hello-World' }, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('awaiting_auth');

      expect(mockGetAuthenticatedUser.call).toHaveBeenCalledTimes(1);
      expect(mockOAuthWorkflow.run).toHaveBeenCalledTimes(1);
      expect(mockOAuthWorkflow.run).toHaveBeenCalledWith(
        { provider: 'github', scopes: ['repo', 'read:org', 'workflow'] },
        expect.objectContaining({
          alias: 'oAuth',
          callback: { transition: 'authCompleted' },
        }),
      );

      // Subsequent tools should NOT be called
      expect(mockListUserOrgs.call).not.toHaveBeenCalled();
      expect(mockGetRepo.call).not.toHaveBeenCalled();
    });
  });
});

describe('GitHubReposOverviewWorkflow with existing entity', () => {
  let module: TestingModule;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should resume from awaiting_auth and complete after auth_completed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const args = { owner: 'octocat', repo: 'Hello-World' };

    jest.clearAllMocks();

    module = await buildWorkflowTest().compile();

    const workflow = module.get(GitHubReposOverviewWorkflow);
    const processor = module.get(WorkflowProcessorService);
    const mockGetAuthenticatedUser: ToolMock = module.get(GitHubGetAuthenticatedUserTool);
    const mockListUserOrgs: ToolMock = module.get(GitHubListUserOrgsTool);
    const mockGetRepo: ToolMock = module.get(GitHubGetRepoTool);
    const mockListBranches: ToolMock = module.get(GitHubListBranchesTool);
    const mockListIssues: ToolMock = module.get(GitHubListIssuesTool);
    const mockListPullRequests: ToolMock = module.get(GitHubListPullRequestsTool);
    const mockListDirectory: ToolMock = module.get(GitHubListDirectoryTool);
    const mockListWorkflowRuns: ToolMock = module.get(GitHubListWorkflowRunsTool);
    const mockSearchCode: ToolMock = module.get(GitHubSearchCodeTool);

    // After auth, the workflow retries from start and succeeds
    mockGetAuthenticatedUser.call.mockResolvedValue({
      data: {
        user: {
          id: 1,
          login: 'octocat',
          name: 'The Octocat',
          email: null,
          avatarUrl: '',
          htmlUrl: 'https://github.com/octocat',
          bio: null,
          publicRepos: 8,
          followers: 100,
          following: 0,
          createdAt: '2011-01-25T00:00:00Z',
        },
      },
    });
    mockListUserOrgs.call.mockResolvedValue({ data: { orgs: [] } });
    mockGetRepo.call.mockResolvedValue({
      data: {
        repo: {
          id: 1,
          fullName: 'octocat/Hello-World',
          name: 'Hello-World',
          owner: 'octocat',
          ownerAvatar: '',
          private: false,
          htmlUrl: 'https://github.com/octocat/Hello-World',
          description: 'Test',
          language: 'JS',
          defaultBranch: 'main',
          stars: 1,
          forks: 0,
          openIssues: 0,
          createdAt: '',
          updatedAt: '',
          topics: [],
          license: null,
        },
      },
    });
    mockListBranches.call.mockResolvedValue({ data: { branches: [] } });
    mockListIssues.call.mockResolvedValue({ data: { issues: [] } });
    mockListPullRequests.call.mockResolvedValue({ data: { pullRequests: [] } });
    mockListDirectory.call.mockResolvedValue({ data: { entries: [] } });
    mockListWorkflowRuns.call.mockResolvedValue({ data: { totalCount: 0, runs: [] } });
    mockSearchCode.call.mockResolvedValue({ data: { totalCount: 0, results: [] } });

    const context = {
      workflowEntity: {
        id: workflowId,
        place: 'awaiting_auth',
        documents: [],
      } as Partial<WorkflowEntity>,
      payload: {
        transition: {
          id: 'authCompleted',
          workflowId,
          payload: { workflowId: 'auth-workflow-id', status: 'completed', data: {} },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, args, context);

    expect(result).toBeDefined();
    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    // Verify markdown document was created after auth resume
    expect(result.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ className: 'MarkdownDocument' })]),
    );

    expect(mockGetAuthenticatedUser.call).toHaveBeenCalledTimes(1);
    expect(mockGetRepo.call).toHaveBeenCalledTimes(1);
  });
});
