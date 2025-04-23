import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { SchemaValidatorService } from '../../common';
import {
  ContextInterface,
  DocumentType,
  Tool,
  EvalContextInfo,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@Tool()
export class DebugImportsService implements ToolInterface {
  schema = z.object({}).optional();

  constructor(private actionHelperService: SchemaValidatorService) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    info: EvalContextInfo,
  ): Promise<ToolResult> {
    const documents: DocumentType[] = [];
    if (workflow?.currData?.imports) {
      for (const [name, item] of Object.entries(workflow?.currData?.imports)) {
        const documentData = {
          name: `debug-${name}`,
          content: JSON.stringify(item, null, 2),
          schema: {
            type: 'string',
            ui: {
              widget: 'debug',
            },
          },
          meta: {
            mimeType: 'text/plain',
            hideAtPlaces: ['finished'],
          },
        } as DocumentType;

        this.actionHelperService.validateDocument(documentData);

        documents.push(documentData);
      }
    }

    return {
      data: {
        // documents todo
      },
    };
  }
}
