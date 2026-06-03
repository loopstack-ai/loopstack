import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { LoopstackContext } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

export type GitRemoteConfigureArgs = {
  url: string;
};

export type GitRemoteConfigureResult = { success: boolean };

@Tool({
  name: 'git_remote_configure',
  description: 'Configures a git remote. Adds the remote if not present, or updates its URL.',
  schema: z
    .object({
      url: z.string().describe('Remote repository URL (HTTPS)'),
    })
    .strict(),
})
export class GitRemoteConfigureTool extends BaseTool<GitRemoteConfigureArgs, object, GitRemoteConfigureResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(
    args: GitRemoteConfigureArgs,
    _ctx: LoopstackContext,
  ): Promise<ToolResult<GitRemoteConfigureResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitConfigureRemote(agentUrl, args.url);
    return { data: result };
  }
}
