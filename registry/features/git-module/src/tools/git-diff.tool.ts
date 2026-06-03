import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitDiffArgs = {
  staged?: boolean;
};

export type GitDiffFile = {
  path: string;
  status: string;
};

export type GitDiffResult = {
  files: GitDiffFile[];
};

@Tool({
  name: 'git_diff',
  description: 'Shows changed files in the workspace. Returns file paths and their change status.',
  schema: z
    .object({
      staged: z.boolean().optional().describe('Show staged changes instead of unstaged'),
    })
    .strict(),
})
export class GitDiffTool extends BaseTool<GitDiffArgs, object, GitDiffResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GitDiffArgs, _ctx: LoopstackContext): Promise<ToolResult<GitDiffResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitDiff(agentUrl, args.staged);
    return { data: result };
  }
}
