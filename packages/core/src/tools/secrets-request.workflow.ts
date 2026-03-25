import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { InjectDocument, InjectTool, Input, Output, State, Workflow, WorkflowInterface } from '@loopstack/common';
import { SecretRequestDocument } from '../documents';
import { CreateDocument } from './create-document.tool';

@Injectable()
@Workflow({
  configFile: __dirname + '/secrets-request.workflow.yaml',
})
export class SecretsRequestWorkflow implements WorkflowInterface {
  @InjectTool() createDocument: CreateDocument;
  @InjectDocument() secretRequestDocument: SecretRequestDocument;

  @Input({
    schema: z.object({
      variables: z.array(
        z.object({
          key: z.string(),
        }),
      ),
    }),
  })
  args: {
    variables: { key: string }[];
  };

  @State({
    schema: z.object({
      submitted: z.boolean().optional(),
    }),
  })
  state: {
    submitted?: boolean;
  };

  @Output({
    schema: z.object({
      success: z.boolean(),
    }),
  })
  getResult() {
    return { success: this.state.submitted ?? false };
  }
}
