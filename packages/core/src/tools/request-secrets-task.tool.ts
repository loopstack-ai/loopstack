import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectWorkflow, Tool, ToolResult } from '@loopstack/common';
import { LinkDocument } from '../documents';
import { SecretsRequestWorkflow } from './secrets-request.workflow';

const RequestSecretsTaskInputSchema = z
  .object({
    variables: z.array(
      z.object({
        key: z.string().describe('The environment variable key (e.g. OPENAI_API_KEY)'),
      }),
    ),
  })
  .strict();

type RequestSecretsTaskInput = z.infer<typeof RequestSecretsTaskInputSchema>;

@Injectable()
@Tool({
  uiConfig: {
    description:
      'Requests secret values from the user. Shows a secure input form where the user can enter API keys and other secrets. ' +
      'Values are stored securely and never exposed to the workflow or LLM. ' +
      'Returns only the key names after the user has provided the values. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
  schema: RequestSecretsTaskInputSchema,
})
export class RequestSecretsTask extends BaseTool {
  private readonly logger = new Logger(RequestSecretsTask.name);

  @InjectWorkflow() private secretsRequest: SecretsRequestWorkflow;

  async call(args: RequestSecretsTaskInput): Promise<ToolResult> {
    const result = await this.secretsRequest.run({ variables: args.variables }, { blockName: 'secretsRequest' });

    await this.repository.save(
      LinkDocument,
      {
        id: 'secrets_link',
        status: 'pending',
        label: 'Requesting Secrets',
        href: `/workflows/${result.workflowId}`,
        embed: true,
        expanded: true,
      },
      { validate: 'skip' },
    );

    return {
      data: result,
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { workflowId?: string };

    await this.repository.save(
      LinkDocument,
      {
        id: 'secrets_link',
        status: 'success',
        label: 'Secrets have been stored',
        href: `/workflows/${data.workflowId}`,
      },
      { validate: 'skip' },
    );

    return {
      data: 'Secrets have been stored securely by the user.',
    };
  }
}
