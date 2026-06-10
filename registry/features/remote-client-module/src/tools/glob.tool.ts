import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

export type GlobArgs = {
  pattern: string;
  path?: string;
};

export type GlobResult = {
  files: string[];
};

@Tool({
  name: 'glob',
  description:
    'Finds files by glob pattern on a remote instance. Supports patterns like "**/*.ts", "src/**/*.{js,ts}". Returns relative file paths.',
  schema: z
    .object({
      pattern: z.string().describe('Glob pattern to match files (e.g. "**/*.ts")'),
      path: z.string().optional().describe('Directory to search in, relative to workspace root'),
    })
    .strict(),
})
export class GlobTool extends BaseTool<GlobArgs, object, GlobResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GlobArgs, _ctx: RunContext): Promise<ToolResult<GlobResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.glob(agentUrl, args.pattern, args.path);
    return { data: result };
  }
}
