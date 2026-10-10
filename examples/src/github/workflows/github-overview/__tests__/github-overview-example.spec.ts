import { describe, expect, it, vi } from 'vitest';
import {
  GitHubGetAuthenticatedUserTool,
  GitHubGetRepoTool,
  GitHubListBranchesTool,
  GitHubListDirectoryTool,
  GitHubListIssuesTool,
  GitHubListPullRequestsTool,
  GitHubListUserOrgsTool,
  GitHubListWorkflowRunsTool,
  GitHubSearchCodeTool,
} from '@loopstack/github';
import { OAuthWorkflow } from '@loopstack/oauth';
import { failure, queue, runWorkflow } from '@loopstack/testing';
import { GithubOverviewExampleWorkflow } from '../github-overview-example.workflow';

/**
 * Testing an OAuth-guarded workflow without a real provider. The OAuth module drags in a
 * callback controller and `WorkflowRunner` that the hermetic facade doesn't boot, so instead
 * of importing the feature modules we fake the workflow's dependencies directly: the first
 * GitHub call rejects with the real "authenticate" message, and the OAuth sub-workflow is a
 * stub. This isolates and asserts the part that matters — the workflow's error-catching and
 * guard routing into the auth branch.
 */
const stubTool = () => ({ call: vi.fn() });

function setup() {
  const authUserTool = {
    call: vi.fn().mockRejectedValue(new Error('No valid GitHub token found. Please authenticate first.')),
  };
  const oAuthWorkflow = { run: vi.fn().mockResolvedValue(undefined) };
  const providers = [
    { provide: GitHubGetAuthenticatedUserTool, useValue: authUserTool },
    { provide: GitHubListUserOrgsTool, useValue: stubTool() },
    { provide: GitHubGetRepoTool, useValue: stubTool() },
    { provide: GitHubListBranchesTool, useValue: stubTool() },
    { provide: GitHubListIssuesTool, useValue: stubTool() },
    { provide: GitHubListPullRequestsTool, useValue: stubTool() },
    { provide: GitHubListDirectoryTool, useValue: stubTool() },
    { provide: GitHubListWorkflowRunsTool, useValue: stubTool() },
    { provide: GitHubSearchCodeTool, useValue: stubTool() },
    { provide: OAuthWorkflow, useValue: oAuthWorkflow },
  ];
  return { authUserTool, oAuthWorkflow, providers };
}

describe('GithubOverviewExampleWorkflow', () => {
  it('catches an unauthorized error and routes into the OAuth branch', async () => {
    const { authUserTool, oAuthWorkflow, providers } = setup();

    const run = await runWorkflow(GithubOverviewExampleWorkflow, undefined, { providers });

    expect(run.error).toBeUndefined();
    // The auth failure was caught and routed to the OAuth sub-workflow launch, then the run
    // parks awaiting the auth callback.
    expect(run.status).toBe('waiting');
    expect(run.place).toBe('awaiting_auth');
    expect(run.path).toContain('authRequired');
    expect(authUserTool.call).toHaveBeenCalledTimes(1);
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(1);
  });

  it('retries from start after a successful sign-in', async () => {
    const { authUserTool, oAuthWorkflow, providers } = setup();

    const run = await runWorkflow(GithubOverviewExampleWorkflow, undefined, {
      providers,
      answers: { authCompleted: queue({ authenticated: true }) },
    });

    // The token is still missing on the retry, so the run asks for sign-in a second time.
    expect(run.status).toBe('waiting');
    expect(run.place).toBe('awaiting_auth');
    expect(authUserTool.call).toHaveBeenCalledTimes(2);
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(2);
  });

  it('fails at auth_failed when the OAuth sub-workflow fails', async () => {
    const { oAuthWorkflow, providers } = setup();

    const run = await runWorkflow(GithubOverviewExampleWorkflow, undefined, {
      providers,
      answers: { authCompleted: queue(failure('GITHUB_CLIENT_ID is not configured')) },
    });

    // A failed sign-in must not loop back to start and launch another OAuth sub-workflow.
    expect(run.status).toBe('failed');
    expect(run.place).toBe('auth_failed');
    expect(run.error).toBe('GITHUB_CLIENT_ID is not configured');
    expect(run.raw.availableTransitions.map((t) => t.id)).toEqual(['retryAuth']);
    expect(oAuthWorkflow.run).toHaveBeenCalledTimes(1);
  });
});
