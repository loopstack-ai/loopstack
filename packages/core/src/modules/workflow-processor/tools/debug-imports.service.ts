import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { SchemaValidatorService } from '../../common';
import {
  ContextInterface,
  Tool,
  WorkflowRunContext,
  ToolInterface,
  ToolResult,
  DocumentEntity,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@Tool()
export class DebugImportsService implements ToolInterface {
  configSchema = z.object({}).optional();
  schema = z.object({}).optional();

  constructor(private actionHelperService: SchemaValidatorService) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<ToolResult> {
    const documents: Partial<DocumentEntity>[] = [];
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
            hideAtPlaces: ['complete'],
          },
        } as Partial<DocumentEntity>;

        this.actionHelperService.validateDocument(documentData);

        documents.push(documentData);
      }
    }

    return {
      commitDirect: true,
    };
  }
}
