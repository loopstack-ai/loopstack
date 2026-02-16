import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import {
  Context,
  InjectDocument,
  InjectTool,
  Input,
  Runtime,
  State,
  Workflow,
  WorkflowInterface,
} from '@loopstack/common';
import { CreateDocument, LinkDocument, MarkdownDocument } from '@loopstack/core-ui-module';
import { AuthRequiredDocument } from '../../oauth-module';
import { GitHubOpenPRsTool } from '../tools';

@Injectable()
@Workflow({
  configFile: __dirname + '/github-open-prs.workflow.yaml',
})
export class GitHubOpenPRsWorkflow implements WorkflowInterface {
  @InjectTool() private gitHubOpenPRs: GitHubOpenPRsTool;
  @InjectTool() private createDocument: CreateDocument;
  @InjectDocument() private authRequiredDocument: AuthRequiredDocument;
  @InjectDocument() private linkDocument: LinkDocument;
  @InjectDocument() private markdown: MarkdownDocument;

  @Input({
    schema: z
      .object({
        orgs: z.array(z.string()).default(['loopstack-ai']),
      })
      .strict(),
  })
  args: {
    orgs: string[];
  };

  @Context()
  context: any;

  @Runtime()
  runtime: any;

  @State({
    schema: z
      .object({
        prs: z
          .array(
            z.object({
              number: z.number(),
              title: z.string(),
              repo: z.string(),
              url: z.string(),
              author: z.string(),
              draft: z.boolean(),
              labels: z.array(z.string()),
              updatedAt: z.string(),
            }),
          )
          .optional(),
        total: z.number().optional(),
        requiresAuthentication: z.boolean().optional(),
      })
      .strict(),
  })
  state: {
    prs?: Array<{
      number: number;
      title: string;
      repo: string;
      url: string;
      author: string;
      draft: boolean;
      labels: string[];
      updatedAt: string;
    }>;
    total?: number;
  };
}
