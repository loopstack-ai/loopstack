import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, Tool, ToolCallOptions, ToolEnvelope } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';
import { SecretsRequestWorkflow } from './secrets-request.workflow.js';

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

export type RequestSecretsTaskResult = { workflowId: string } | string;

@Tool({
  name: 'request_secrets_task',
  description:
    'Requests secret values from the user. Shows a secure input form where the user can enter API keys and other secrets. ' +
    'Values are stored securely and never exposed to the workflow or LLM. ' +
    'Returns only the key names after the user has provided the values. ' +
    'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  schema: RequestSecretsTaskInputSchema,
})
export class RequestSecretsTask extends BaseTool<RequestSecretsTaskInput, object, RequestSecretsTaskResult> {
  private readonly logger = new Logger(RequestSecretsTask.name);

  constructor(private readonly secretsRequestWorkflow: SecretsRequestWorkflow) {
    super();
  }

  protected async handle(
    args: RequestSecretsTaskInput,
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolEnvelope<RequestSecretsTaskResult>> {
    const result = await this.secretsRequestWorkflow.run(
      { variables: args.variables },
      { callback: options?.callback, show: 'inline', label: 'Requesting Secrets' },
    );

    return {
      data: { workflowId: result.workflowId },
      pending: { workflowId: result.workflowId },
    };
  }

  async complete(_result: Record<string, unknown>): Promise<ToolEnvelope<RequestSecretsTaskResult>> {
    return {
      data: 'Secrets have been stored securely by the user.',
    };
  }
}
