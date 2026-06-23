import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';
import { EnvironmentService } from '../services/environment.service.js';
import { RemoteClient } from '../services/remote-client.service.js';

export type ReadArgs = {
  file_path: string;
  offset?: number;
  limit?: number;
};

export type ReadResult = {
  content: string;
  path: string;
};

@Tool({
  name: 'read',
  description:
    'Reads a file from a remote instance. Returns file content. Supports offset and limit for reading specific line ranges.',
  schema: z
    .object({
      file_path: z.string().describe('The file path to read'),
      offset: z.number().optional().describe('Line number to start reading from (1-indexed)'),
      limit: z.number().optional().describe('Number of lines to read'),
    })
    .strict(),
})
export class ReadTool extends BaseTool<ReadArgs, object, ReadResult> {
  constructor(
    private readonly env: EnvironmentService,
    private readonly remote: RemoteClient,
  ) {
    super();
  }

  protected async handle(args: ReadArgs): Promise<ToolEnvelope<ReadResult>> {
    const agentUrl = await this.env.getAgentUrl();
    const result = await this.remote.readFile(agentUrl, args.file_path, args.offset, args.limit);
    return { data: { content: result.content, path: args.file_path } };
  }
}
