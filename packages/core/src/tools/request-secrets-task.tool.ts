import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectDocument, InjectTool, Input, Tool, ToolResult, ToolSideEffects } from '@loopstack/common';
import { LinkDocument } from '../documents';
import { CreateDocument } from './create-document.tool';
import { Task } from './task.tool';

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
  config: {
    description:
      'Requests secret values from the user. Shows a secure input form where the user can enter API keys and other secrets. ' +
      'Values are stored securely and never exposed to the workflow or LLM. ' +
      'Returns only the key names after the user has provided the values. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
})
export class RequestSecretsTask extends BaseTool {
  private readonly logger = new Logger(RequestSecretsTask.name);

  @InjectTool() private task: Task;
  @InjectTool() private createDocument: CreateDocument;
  @InjectDocument() private linkDocument: LinkDocument;

  @Input({ schema: RequestSecretsTaskInputSchema })
  args: RequestSecretsTaskInput;

  async run(args: RequestSecretsTaskInput): Promise<ToolResult> {
    const taskResult = await this.task.run({ workflow: 'secretsRequest', args: { variables: args.variables } });

    const effects: ToolSideEffects[] = [];

    const linkResult = await this.createDocument.run({
      document: 'linkDocument',
      id: 'secrets_link',
      validate: 'skip' as const,
      update: {
        content: {
          status: 'pending',
          label: 'Requesting Secrets',
          href: `/workflows/${(taskResult.data as { workflowId: string }).workflowId}`,
          embed: true,
          expanded: true,
        },
      },
    });
    if (linkResult.effects) {
      effects.push(...linkResult.effects);
    }

    return {
      data: taskResult.data as Record<string, unknown>,
      effects,
    };
  }

  async complete(result: Record<string, unknown>): Promise<ToolResult> {
    const data = result as { workflowId?: string };

    const effects: ToolSideEffects[] = [];

    const linkResult = await this.createDocument.run({
      document: 'linkDocument',
      id: 'secrets_link',
      validate: 'skip' as const,
      update: {
        content: {
          status: 'success',
          label: 'Secrets have been stored',
          href: `/workflows/${data.workflowId}`,
        },
      },
    });
    if (linkResult.effects) {
      effects.push(...linkResult.effects);
    }

    return {
      data: 'Secrets have been stored securely by the user.',
      effects,
    };
  }
}
