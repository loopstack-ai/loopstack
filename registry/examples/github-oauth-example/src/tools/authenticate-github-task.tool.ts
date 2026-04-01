import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BaseTool, InjectDocument, InjectTool, Input, Tool, ToolResult, ToolSideEffects } from '@loopstack/common';
import { CreateDocument, LinkDocument, Task } from '@loopstack/core';

const AuthenticateGitHubTaskInputSchema = z
  .object({
    scopes: z.array(z.string()).describe('The OAuth scopes to request (e.g. repo, user, workflow, read:org)'),
  })
  .strict();

type AuthenticateGitHubTaskInput = z.infer<typeof AuthenticateGitHubTaskInputSchema>;

@Injectable()
@Tool({
  config: {
    description:
      'Launches GitHub OAuth authentication. Shows the user a sign-in prompt to authorize access to GitHub. ' +
      'Use this when a GitHub tool returns an "unauthorized" error. ' +
      'Pass the required OAuth scopes for the GitHub APIs you need access to. ' +
      'IMPORTANT: When using this tool, it must be the ONLY tool call in your response. Do not combine it with other tool calls.',
  },
})
export class AuthenticateGitHubTask extends BaseTool {
  private readonly logger = new Logger(AuthenticateGitHubTask.name);

  @InjectTool() private task: Task;
  @InjectTool() private createDocument: CreateDocument;
  @InjectDocument() private linkDocument: LinkDocument;

  @Input({ schema: AuthenticateGitHubTaskInputSchema })
  args: AuthenticateGitHubTaskInput;

  async run(args: AuthenticateGitHubTaskInput): Promise<ToolResult> {
    const taskResult = await this.task.run({
      workflow: 'oAuth',
      args: { provider: 'github', scopes: args.scopes },
    });

    const effects: ToolSideEffects[] = [];

    const linkResult = await this.createDocument.run({
      document: 'linkDocument',
      id: 'github_auth_link',
      validate: 'skip' as const,
      update: {
        content: {
          status: 'pending',
          label: 'GitHub authentication required',
          href: `/workflows/${String((taskResult.data as Record<string, unknown>).workflowId)}`,
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
      id: 'github_auth_link',
      validate: 'skip' as const,
      update: {
        content: {
          status: 'success',
          label: 'GitHub authentication completed',
          href: `/workflows/${data.workflowId}`,
        },
      },
    });
    if (linkResult.effects) {
      effects.push(...linkResult.effects);
    }

    return {
      data: 'GitHub authentication completed successfully. You can now use GitHub tools.',
      effects,
    };
  }
}
