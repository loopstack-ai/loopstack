import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { Input, RunContext, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { SecretService } from '../persistence';

const GetSecretKeysInputSchema = z.object({}).strict();

type GetSecretKeysInput = z.infer<typeof GetSecretKeysInputSchema>;

@Tool({
  config: {
    description: 'Returns the list of secret keys for the current workspace. Does not return secret values.',
  },
})
export class GetSecretKeysTool implements ToolInterface<GetSecretKeysInput> {
  @Inject() private secretService: SecretService;

  @Input({ schema: GetSecretKeysInputSchema })
  args: GetSecretKeysInput;

  async execute(_args: GetSecretKeysInput, context: RunContext): Promise<ToolResult> {
    const secrets = await this.secretService.findAllByWorkspace(context.workspaceId);
    return {
      data: secrets.map((s) => ({
        key: s.key,
        hasValue: !!s.value,
      })),
    };
  }
}
