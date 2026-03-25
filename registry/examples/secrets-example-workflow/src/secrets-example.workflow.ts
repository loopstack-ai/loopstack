import { Injectable } from '@nestjs/common';
import z from 'zod';
import { InjectDocument, InjectTool, State, Workflow } from '@loopstack/common';
import {
  CreateDocument,
  GetSecretKeysTool,
  MarkdownDocument,
  RequestSecretsTool,
  SecretRequestDocument,
} from '@loopstack/core';

@Injectable()
@Workflow({
  config: {
    description: 'Test the secrets request and verification flow',
  },
  configFile: __dirname + '/secrets-example.workflow.yaml',
})
export class SecretsExampleWorkflow {
  @InjectTool() private createDocument: CreateDocument;
  @InjectTool() private requestSecrets: RequestSecretsTool;
  @InjectTool() private getSecretKeys: GetSecretKeysTool;
  @InjectDocument() private secretRequestDocument: SecretRequestDocument;
  @InjectDocument() private markdownDocument: MarkdownDocument;

  @State({
    schema: z.object({
      secretKeys: z
        .array(
          z.object({
            key: z.string(),
            hasValue: z.boolean(),
          }),
        )
        .optional(),
    }),
  })
  state: any;
}
