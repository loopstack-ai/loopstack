import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  Context,
  DefineHelper,
  InjectDocument,
  InjectTool,
  InjectWorkflow,
  Input,
  Runtime,
  State,
  Workflow,
  WorkflowInterface,
} from '@loopstack/common';
import { CreateDocument, LinkDocument, MarkdownDocument, Task } from '@loopstack/core';
import { CreateChatMessage } from '@loopstack/create-chat-message-tool';
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
import { OAuthWorkflow } from '@loopstack/oauth-module';

@Injectable()
@Workflow({
  configFile: __dirname + '/github-repos-overview.workflow.yaml',
})
export class GitHubReposOverviewWorkflow implements WorkflowInterface {
  // Core tools
  @InjectTool() private task: Task;
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private createChatMessage: CreateChatMessage;

  // GitHub — Users
  @InjectTool() private gitHubGetAuthenticatedUser: GitHubGetAuthenticatedUserTool;
  @InjectTool() private gitHubListUserOrgs: GitHubListUserOrgsTool;

  // GitHub — Repos
  @InjectTool() private gitHubListRepos: GitHubListReposTool;
  @InjectTool() private gitHubGetRepo: GitHubGetRepoTool;
  @InjectTool() private gitHubCreateRepo: GitHubCreateRepoTool;
  @InjectTool() private gitHubListBranches: GitHubListBranchesTool;

  // GitHub — Issues
  @InjectTool() private gitHubListIssues: GitHubListIssuesTool;
  @InjectTool() private gitHubGetIssue: GitHubGetIssueTool;
  @InjectTool() private gitHubCreateIssue: GitHubCreateIssueTool;
  @InjectTool() private gitHubCreateIssueComment: GitHubCreateIssueCommentTool;

  // GitHub — Pull Requests
  @InjectTool() private gitHubListPullRequests: GitHubListPullRequestsTool;
  @InjectTool() private gitHubGetPullRequest: GitHubGetPullRequestTool;
  @InjectTool() private gitHubCreatePullRequest: GitHubCreatePullRequestTool;
  @InjectTool() private gitHubMergePullRequest: GitHubMergePullRequestTool;
  @InjectTool() private gitHubListPrReviews: GitHubListPrReviewsTool;

  // GitHub — Content
  @InjectTool() private gitHubGetFileContent: GitHubGetFileContentTool;
  @InjectTool() private gitHubCreateOrUpdateFile: GitHubCreateOrUpdateFileTool;
  @InjectTool() private gitHubListDirectory: GitHubListDirectoryTool;
  @InjectTool() private gitHubGetCommit: GitHubGetCommitTool;

  // GitHub — Actions
  @InjectTool() private gitHubListWorkflowRuns: GitHubListWorkflowRunsTool;
  @InjectTool() private gitHubTriggerWorkflow: GitHubTriggerWorkflowTool;
  @InjectTool() private gitHubGetWorkflowRun: GitHubGetWorkflowRunTool;

  // GitHub — Search
  @InjectTool() private gitHubSearchCode: GitHubSearchCodeTool;
  @InjectTool() private gitHubSearchRepos: GitHubSearchReposTool;
  @InjectTool() private gitHubSearchIssues: GitHubSearchIssuesTool;

  // Documents
  @InjectDocument() private linkDocument: LinkDocument;
  @InjectDocument() private markdown: MarkdownDocument;

  @InjectWorkflow() oAuth: OAuthWorkflow;

  @Input({
    schema: z
      .object({
        owner: z.string().default('octocat'),
        repo: z.string().default('Hello-World'),
      })
      .strict(),
  })
  args: {
    owner: string;
    repo: string;
  };

  @Context()
  context: any;

  @Runtime()
  runtime: any;

  @State({
    schema: z
      .object({
        requiresAuthentication: z.boolean().optional(),
        user: z
          .object({
            login: z.string(),
            name: z.string().nullable(),
            htmlUrl: z.string(),
            publicRepos: z.number(),
          })
          .optional(),
        orgs: z
          .array(
            z.object({
              login: z.string(),
              description: z.string().nullable(),
            }),
          )
          .optional(),
        repo: z
          .object({
            fullName: z.string(),
            description: z.string().nullable(),
            language: z.string().nullable(),
            stars: z.number(),
            forks: z.number(),
            openIssues: z.number(),
            defaultBranch: z.string(),
            htmlUrl: z.string(),
          })
          .optional(),
        branches: z
          .array(
            z.object({
              name: z.string(),
              protected: z.boolean(),
            }),
          )
          .optional(),
        issues: z
          .array(
            z.object({
              number: z.number(),
              title: z.string(),
              state: z.string(),
              user: z.string(),
              htmlUrl: z.string(),
            }),
          )
          .optional(),
        pullRequests: z
          .array(
            z.object({
              number: z.number(),
              title: z.string(),
              state: z.string(),
              user: z.string(),
              draft: z.boolean(),
              htmlUrl: z.string(),
            }),
          )
          .optional(),
        directoryEntries: z
          .array(
            z.object({
              name: z.string(),
              type: z.string(),
              path: z.string(),
            }),
          )
          .optional(),
        workflowRuns: z
          .array(
            z.object({
              id: z.number(),
              name: z.string(),
              status: z.string(),
              conclusion: z.string().nullable(),
              htmlUrl: z.string(),
            }),
          )
          .optional(),
        searchResults: z
          .array(
            z.object({
              name: z.string(),
              path: z.string(),
              repository: z.string(),
            }),
          )
          .optional(),
      })
      .strict(),
  })
  state: {
    requiresAuthentication?: boolean;
    user?: { login: string; name: string | null; htmlUrl: string; publicRepos: number };
    orgs?: Array<{ login: string; description: string | null }>;
    repo?: {
      fullName: string;
      description: string | null;
      language: string | null;
      stars: number;
      forks: number;
      openIssues: number;
      defaultBranch: string;
      htmlUrl: string;
    };
    branches?: Array<{ name: string; protected: boolean }>;
    issues?: Array<{ number: number; title: string; state: string; user: string; htmlUrl: string }>;
    pullRequests?: Array<{
      number: number;
      title: string;
      state: string;
      user: string;
      draft: boolean;
      htmlUrl: string;
    }>;
    directoryEntries?: Array<{ name: string; type: string; path: string }>;
    workflowRuns?: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      htmlUrl: string;
    }>;
    searchResults?: Array<{ name: string; path: string; repository: string }>;
  };

  @DefineHelper()
  searchQuery() {
    return `repo:${this.args.owner}/${this.args.repo}`;
  }
}
