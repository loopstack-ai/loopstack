import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  InjectDocument,
  InjectTool,
  Input,
  RunContext,
  Tool,
  ToolInterface,
  ToolResult,
  ToolSideEffects,
  WorkflowInterface,
  WorkflowMetadataInterface,
} from '@loopstack/common';
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
export class RequestSecretsTask implements ToolInterface<RequestSecretsTaskInput> {
  private readonly logger = new Logger(RequestSecretsTask.name);

  @InjectTool() private task: Task;
  @InjectTool() private createDocument: CreateDocument;
  @InjectDocument() private linkDocument: LinkDocument;

  @Input({ schema: RequestSecretsTaskInputSchema })
  args: RequestSecretsTaskInput;

  async execute(
    args: RequestSecretsTaskInput,
    ctx: RunContext,
    parent: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const taskResult = await this.task.execute(
      { workflow: 'secretsRequest', args: { variables: args.variables } },
      ctx,
      parent,
    );

    const effects: ToolSideEffects[] = [];

    const linkResult = await this.createDocument.execute(
      {
        document: 'linkDocument',
        id: 'secrets_link',
        validate: 'skip' as const,
        update: {
          content: {
            icon: 'Clock',
            label: 'Requesting Secrets',
            href: `/pipelines/${(taskResult.data as { pipelineId: string }).pipelineId}`,
            embed: true,
            expanded: true,
          },
        },
      },
      ctx,
      this,
      metadata,
    );
    if (linkResult.effects) {
      effects.push(...linkResult.effects);
    }

    return {
      data: taskResult.data as Record<string, unknown>,
      effects,
    };
  }

  async complete(
    result: Record<string, unknown>,
    ctx: RunContext,
    parent: WorkflowInterface | ToolInterface,
    metadata: WorkflowMetadataInterface,
  ): Promise<ToolResult> {
    const data = result as { pipelineId?: string };

    const effects: ToolSideEffects[] = [];

    const linkResult = await this.createDocument.execute(
      {
        document: 'linkDocument',
        id: 'secrets_link',
        validate: 'skip' as const,
        update: {
          content: {
            icon: 'CircleCheck',
            label: 'Secrets have been stored',
            href: `/pipelines/${data.pipelineId}`,
          },
        },
      },
      ctx,
      this,
      metadata,
    );
    if (linkResult.effects) {
      effects.push(...linkResult.effects);
    }

    return {
      data: 'Secrets have been stored securely by the user.',
      effects,
    };
  }
}
