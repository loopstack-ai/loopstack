import { z } from 'zod';
import { BaseTool, Tool, ToolResult } from '@loopstack/common';
import type { RunContext } from '@loopstack/common';

const RequestSecretsInputSchema = z
  .object({
    variables: z.array(
      z.object({
        key: z.string().describe('The environment variable key (e.g. OPENAI_API_KEY)'),
      }),
    ),
  })
  .strict();

type RequestSecretsInput = z.infer<typeof RequestSecretsInputSchema>;

export type RequestSecretsResult = { variables: { key: string }[] };

@Tool({
  name: 'request_secrets',
  description:
    'Requests secret values from the user. Shows a secure input form where the user can enter API keys and other secrets. ' +
    'Values are stored securely and never exposed to the workflow or LLM. ' +
    'Returns only the key names after the user has provided the values. ' +
    'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  schema: RequestSecretsInputSchema,
})
export class RequestSecretsTool extends BaseTool<RequestSecretsInput, object, RequestSecretsResult> {
  protected async handle(args: RequestSecretsInput, _ctx: RunContext): Promise<ToolResult<RequestSecretsResult>> {
    return Promise.resolve({
      data: { variables: args.variables },
    });
  }
}
