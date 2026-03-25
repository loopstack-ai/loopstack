import { z } from 'zod';
import { Input, Tool, ToolInterface, ToolResult } from '@loopstack/common';

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

@Tool({
  config: {
    description:
      'Requests secret values from the user. Shows a secure input form where the user can enter API keys and other secrets. ' +
      'Values are stored securely and never exposed to the workflow or LLM. ' +
      'Returns only the key names after the user has provided the values. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
})
export class RequestSecretsTool implements ToolInterface<RequestSecretsInput> {
  @Input({ schema: RequestSecretsInputSchema })
  args: RequestSecretsInput;

  execute(args: RequestSecretsInput): Promise<ToolResult> {
    return Promise.resolve({
      data: { variables: args.variables },
    });
  }
}
