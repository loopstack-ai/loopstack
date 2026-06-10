import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

export type GrepArgs = {
  pattern: string;
  path?: string;
  glob?: string;
  type?: string;
  case_insensitive?: boolean;
};

export type GrepResult = {
  matches: { file: string; line: number; content: string }[];
};

@Tool({
  name: 'grep',
  description:
    'Searches file contents by regex pattern on a remote instance. Returns matching lines with file paths and line numbers.',
  schema: z
    .object({
      pattern: z.string().describe('Regex pattern to search for in file contents'),
      path: z.string().optional().describe('Directory to search in, relative to workspace root'),
      glob: z.string().optional().describe('Glob pattern to filter files (e.g. "*.ts")'),
      type: z.string().optional().describe('File type filter (e.g. "js", "ts", "py")'),
      case_insensitive: z.boolean().optional().describe('Case-insensitive search'),
    })
    .strict(),
})
export class GrepTool extends BaseTool<GrepArgs, object, GrepResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: GrepArgs, _ctx: RunContext): Promise<ToolResult<GrepResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.grep(agentUrl, args.pattern, args.path, {
      glob: args.glob,
      type: args.type,
      caseInsensitive: args.case_insensitive,
    });
    return { data: result };
  }
}
