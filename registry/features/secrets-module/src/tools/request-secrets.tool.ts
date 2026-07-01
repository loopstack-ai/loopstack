import { z } from 'zod';
import { BaseTool, Tool, ToolEnvelope } from '@loopstack/common';

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

/**
 * Result for `request_secrets` — the list of requested secret keys after the user submits the form.
 *
 * @public
 */
export type RequestSecretsResult = { variables: { key: string }[] };

/**
 * Tool that asks the user for secret values through a secure Studio form; values are stored server-side
 * and only the key names are returned, never the secrets themselves.
 *
 * @providedBy SecretsModule
 * @public
 */
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
  protected async handle(args: RequestSecretsInput): Promise<ToolEnvelope<RequestSecretsResult>> {
    return Promise.resolve({
      data: { variables: args.variables },
    });
  }
}
