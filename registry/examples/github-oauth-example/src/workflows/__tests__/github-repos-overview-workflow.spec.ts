import { TestingModule } from '@nestjs/testing';
import { z } from 'zod';
import {
  RunContext,
  generateObjectFingerprint,
  getBlockArgsSchema,
  getBlockConfig,
  getBlockDocuments,
  getBlockHelper,
  getBlockHelpers,
  getBlockStateSchema,
  getBlockTools,
} from '@loopstack/common';
import { CreateDocument, LoopCoreModule, Task, WorkflowProcessorService } from '@loopstack/core';
import { CreateChatMessage, CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
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
import { OAuthModule } from '@loopstack/oauth-module';
import { ToolMock, createWorkflowTest } from '@loopstack/testing';
import { GitHubReposOverviewWorkflow } from '../github-repos-overview.workflow';

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
  let mockTask: ToolMock;
  let mockCreateDocument: ToolMock;

  function buildWorkflowTest() {
    return applyAllGitHubToolMocks(
      createWorkflowTest()
        .forWorkflow(GitHubReposOverviewWorkflow)
        .withImports(LoopCoreModule, CreateChatMessageToolModule, OAuthModule)
        .withToolOverride(Task)
        .withToolOverride(CreateDocument)
        .withToolOverride(CreateChatMessage),
    );
  }

  beforeEach(async () => {
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
    mockTask = module.get(Task);
    mockCreateDocument = module.get(CreateDocument);
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

    it('should have stateSchema defined', () => {
      expect(getBlockStateSchema(workflow)).toBeDefined();
      expect(getBlockStateSchema(workflow)).toBeInstanceOf(z.ZodType);
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });

    it('should have all 28 tools available', () => {
      const tools = getBlockTools(workflow);
      expect(tools).toBeDefined();
      expect(tools).toHaveLength(28);

      // Core tools
      expect(tools).toContain('task');
      expect(tools).toContain('createDocument');
      expect(tools).toContain('createChatMessage');

      // GitHub — Users
      expect(tools).toContain('gitHubGetAuthenticatedUser');
      expect(tools).toContain('gitHubListUserOrgs');

      // GitHub — Repos
      expect(tools).toContain('gitHubListRepos');
      expect(tools).toContain('gitHubGetRepo');
      expect(tools).toContain('gitHubCreateRepo');
      expect(tools).toContain('gitHubListBranches');

      // GitHub — Issues
      expect(tools).toContain('gitHubListIssues');
      expect(tools).toContain('gitHubGetIssue');
      expect(tools).toContain('gitHubCreateIssue');
      expect(tools).toContain('gitHubCreateIssueComment');

      // GitHub — Pull Requests
      expect(tools).toContain('gitHubListPullRequests');
      expect(tools).toContain('gitHubGetPullRequest');
      expect(tools).toContain('gitHubCreatePullRequest');
      expect(tools).toContain('gitHubMergePullRequest');
      expect(tools).toContain('gitHubListPrReviews');

      // GitHub — Content
      expect(tools).toContain('gitHubGetFileContent');
      expect(tools).toContain('gitHubCreateOrUpdateFile');
      expect(tools).toContain('gitHubListDirectory');
      expect(tools).toContain('gitHubGetCommit');

      // GitHub — Actions
      expect(tools).toContain('gitHubListWorkflowRuns');
      expect(tools).toContain('gitHubTriggerWorkflow');
      expect(tools).toContain('gitHubGetWorkflowRun');

      // GitHub — Search
      expect(tools).toContain('gitHubSearchCode');
      expect(tools).toContain('gitHubSearchRepos');
      expect(tools).toContain('gitHubSearchIssues');
    });

    it('should have all documents available', () => {
      expect(getBlockDocuments(workflow)).toBeDefined();
      expect(Array.isArray(getBlockDocuments(workflow))).toBe(true);
      expect(getBlockDocuments(workflow)).toContain('linkDocument');
      expect(getBlockDocuments(workflow)).toContain('markdown');
      expect(getBlockDocuments(workflow)).toHaveLength(2);
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

  describe('states', () => {
    it('should have stateSchema with expected properties', () => {
      const schema = getBlockStateSchema(workflow) as z.ZodObject<any>;
      expect(schema).toBeDefined();
      const shape = schema.shape;
      expect(shape.requiresAuthentication).toBeDefined();
      expect(shape.user).toBeDefined();
      expect(shape.orgs).toBeDefined();
      expect(shape.repo).toBeDefined();
      expect(shape.branches).toBeDefined();
      expect(shape.issues).toBeDefined();
      expect(shape.pullRequests).toBeDefined();
      expect(shape.directoryEntries).toBeDefined();
      expect(shape.workflowRuns).toBeDefined();
      expect(shape.searchResults).toBeDefined();
    });

    it('should validate state with all optional fields', () => {
      const schema = getBlockStateSchema(workflow)!;
      const result = schema.parse({});
      expect(result).toEqual({});
    });

    it('should throw error for invalid state field types', () => {
      const schema = getBlockStateSchema(workflow)!;
      expect(() => schema.parse({ repos: 'not-an-array' })).toThrow();
      expect(() => schema.parse({ requiresAuthentication: 'not-a-boolean' })).toThrow();
    });
  });

  describe('helpers', () => {
    it('should have helpers defined', () => {
      expect(getBlockHelpers(workflow)).toBeDefined();
      expect(Array.isArray(getBlockHelpers(workflow))).toBe(true);
    });

    it('should have searchQuery helper registered', () => {
      expect(getBlockHelpers(workflow)).toContain('searchQuery');
    });

    it('should execute searchQuery helper and return repo-scoped query', () => {
      // Set args on the workflow instance so the helper can read them
      (workflow as any).args = { owner: 'octocat', repo: 'Hello-World' };
      const helper = getBlockHelper(workflow, 'searchQuery')!;
      expect(helper).toBeDefined();
      const result = helper.call(workflow);
      expect(result).toBe('repo:octocat/Hello-World');
    });
  });

  describe('workflow execution — happy path', () => {
    const args = { owner: 'octocat', repo: 'Hello-World' };

    function setupAllMocks() {
      mockGetAuthenticatedUser.execute.mockResolvedValue({
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

      mockListUserOrgs.execute.mockResolvedValue({
        data: {
          orgs: [{ id: 1, login: 'github', description: 'How people build software', avatarUrl: '' }],
        },
      });

      mockGetRepo.execute.mockResolvedValue({
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

      mockListBranches.execute.mockResolvedValue({
        data: {
          branches: [
            { name: 'main', commitSha: 'abc123', protected: true },
            { name: 'develop', commitSha: 'def456', protected: false },
          ],
        },
      });

      mockListIssues.execute.mockResolvedValue({
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

      mockListPullRequests.execute.mockResolvedValue({
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

      mockListDirectory.execute.mockResolvedValue({
        data: {
          entries: [
            { name: 'README.md', path: 'README.md', sha: 'abc', size: 1234, type: 'file', htmlUrl: '' },
            { name: 'src', path: 'src', sha: 'def', size: 0, type: 'dir', htmlUrl: '' },
          ],
        },
      });

      mockListWorkflowRuns.execute.mockResolvedValue({
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

      mockSearchCode.execute.mockResolvedValue({
        data: {
          totalCount: 1,
          results: [
            { name: 'index.js', path: 'src/index.js', sha: 'xyz', htmlUrl: '', repository: 'octocat/Hello-World' },
          ],
        },
      });
    }

    it('should execute full pipeline from start to end', async () => {
      const context = {} as RunContext;
      setupAllMocks();

      const result = await processor.process(workflow, args, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');

      // Verify all read tools were called
      expect(mockGetAuthenticatedUser.execute).toHaveBeenCalledTimes(1);
      expect(mockListUserOrgs.execute).toHaveBeenCalledTimes(1);
      expect(mockGetRepo.execute).toHaveBeenCalledTimes(1);
      expect(mockListBranches.execute).toHaveBeenCalledTimes(1);
      expect(mockListIssues.execute).toHaveBeenCalledTimes(1);
      expect(mockListPullRequests.execute).toHaveBeenCalledTimes(1);
      expect(mockListDirectory.execute).toHaveBeenCalledTimes(1);
      expect(mockListWorkflowRuns.execute).toHaveBeenCalledTimes(1);
      expect(mockSearchCode.execute).toHaveBeenCalledTimes(1);
      expect(mockCreateDocument.execute).toHaveBeenCalledTimes(1);
    });

    it('should pass owner and repo to gitHubGetRepo', async () => {
      const context = {} as RunContext;
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockGetRepo.execute).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World' }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should pass owner and repo to gitHubListBranches', async () => {
      const context = {} as RunContext;
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListBranches.execute).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World' }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should pass owner and repo to gitHubListIssues with state open', async () => {
      const context = {} as RunContext;
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListIssues.execute).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World', state: 'open' }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should pass owner and repo to gitHubListPullRequests', async () => {
      const context = {} as RunContext;
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListPullRequests.execute).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World', state: 'open' }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should pass owner and repo to gitHubListDirectory', async () => {
      const context = {} as RunContext;
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListDirectory.execute).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World' }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should pass owner and repo to gitHubListWorkflowRuns', async () => {
      const context = {} as RunContext;
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockListWorkflowRuns.execute).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'octocat', repo: 'Hello-World' }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should pass repo-scoped query to gitHubSearchCode', async () => {
      const context = {} as RunContext;
      setupAllMocks();

      await processor.process(workflow, args, context);

      expect(mockSearchCode.execute).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'repo:octocat/Hello-World' }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('workflow execution — auth flow', () => {
    it('should stop at awaiting_auth when unauthorized', async () => {
      const context = {} as RunContext;

      mockGetAuthenticatedUser.execute.mockResolvedValue({
        data: {
          error: 'unauthorized',
          message: 'No valid GitHub token found. Please authenticate first.',
        },
      });

      mockTask.execute.mockResolvedValue({
        data: { pipelineId: 'test-pipeline-id' },
      });

      const result = await processor.process(workflow, { owner: 'octocat', repo: 'Hello-World' }, context);

      expect(result).toBeDefined();
      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('awaiting_auth');

      expect(mockGetAuthenticatedUser.execute).toHaveBeenCalledTimes(1);
      expect(mockTask.execute).toHaveBeenCalledTimes(1);
      expect(mockTask.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow: 'oAuth',
          args: expect.objectContaining({
            provider: 'github',
            scopes: ['repo', 'read:org', 'workflow'],
          }),
          callback: { transition: 'auth_completed' },
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );

      // Subsequent tools should NOT be called
      expect(mockListUserOrgs.execute).not.toHaveBeenCalled();
      expect(mockGetRepo.execute).not.toHaveBeenCalled();
    });
  });
});

describe('GitHubReposOverviewWorkflow with existing entity', () => {
  let module: TestingModule;

  function buildWorkflowTest() {
    return applyAllGitHubToolMocks(
      createWorkflowTest()
        .forWorkflow(GitHubReposOverviewWorkflow)
        .withImports(LoopCoreModule, CreateChatMessageToolModule, OAuthModule)
        .withToolOverride(Task)
        .withToolOverride(CreateDocument)
        .withToolOverride(CreateChatMessage),
    );
  }

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should resume from awaiting_auth and complete after auth_completed', async () => {
    const workflowId = '00000000-0000-0000-0000-000000000001';
    const args = { owner: 'octocat', repo: 'Hello-World' };

    module = await buildWorkflowTest()
      .withExistingWorkflow({
        place: 'awaiting_auth',
        inputData: args,
        id: workflowId,
        hashRecord: {
          options: generateObjectFingerprint(args),
        },
      })
      .compile();

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
    const mockCreateDocument: ToolMock = module.get(CreateDocument);

    // After auth, the workflow retries from start and succeeds
    mockGetAuthenticatedUser.execute.mockResolvedValue({
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
    mockListUserOrgs.execute.mockResolvedValue({ data: { orgs: [] } });
    mockGetRepo.execute.mockResolvedValue({
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
    mockListBranches.execute.mockResolvedValue({ data: { branches: [] } });
    mockListIssues.execute.mockResolvedValue({ data: { issues: [] } });
    mockListPullRequests.execute.mockResolvedValue({ data: { pullRequests: [] } });
    mockListDirectory.execute.mockResolvedValue({ data: { entries: [] } });
    mockListWorkflowRuns.execute.mockResolvedValue({ data: { totalCount: 0, runs: [] } });
    mockSearchCode.execute.mockResolvedValue({ data: { totalCount: 0, results: [] } });

    const context = {
      payload: {
        transition: {
          id: 'auth_completed',
          workflowId,
          payload: { pipelineId: 'auth-pipeline-id' },
        },
      },
    } as unknown as RunContext;

    const result = await processor.process(workflow, args, context);

    expect(result).toBeDefined();
    expect(result.hasError).toBe(false);
    expect(result.place).toBe('end');

    expect(mockCreateDocument.execute).toHaveBeenCalled();
    expect(mockGetAuthenticatedUser.execute).toHaveBeenCalledTimes(1);
    expect(mockGetRepo.execute).toHaveBeenCalledTimes(1);
  });

  it('should resume from existing workflow state', async () => {
    module = await buildWorkflowTest()
      .withExistingWorkflow({
        place: 'repo_fetched',
        inputData: { owner: 'octocat', repo: 'Hello-World' },
      })
      .compile();

    const workflow = module.get(GitHubReposOverviewWorkflow);
    expect(workflow).toBeDefined();
  });
});
