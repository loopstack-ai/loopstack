import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService, RemoteClient } from '@loopstack/remote-client';

/**
 * Args for `GitRemoteConfigureTool`.
 *
 * @public
 */
export type GitRemoteConfigureArgs = {
  url: string;
};

/**
 * Result for `GitRemoteConfigureTool`.
 *
 * @public
 */
export type GitRemoteConfigureResult = { success: boolean };

/**
 * Tool that configures a git remote, adding it if absent or updating its URL.
 *
 * @providedBy GitModule
 * @public
 */
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

  protected async handle(args: GitRemoteConfigureArgs): Promise<ToolEnvelope<GitRemoteConfigureResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.gitConfigureRemote(agentUrl, args.url);
    return { data: result };
  }
}
