import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ActionHelperService } from '../../common';
import {
  ContextInterface,
  DocumentType, Tool,
  ToolApplicationInfo,
  ToolInterface,
  ToolResult,
  WorkflowData,
} from '@loopstack/shared';
import { WorkflowEntity } from '@loopstack/shared';

@Injectable()
@Tool()
export class DebugImportsTool implements ToolInterface {
  schema = z.object({}).optional();

  constructor(private actionHelperService: ActionHelperService) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
    context: ContextInterface,
    data: WorkflowData | undefined,
    info: ToolApplicationInfo,
  ): Promise<ToolResult> {
    const documents: DocumentType[] = [];
    if (data?.imports) {
      for (const [name, item] of Object.entries(data.imports)) {
        const documentData = {
          name: `debug-${name}`,
          content: JSON.stringify(item, null, 2),
          schema: {
            type: 'string',
            ui: {
              widget: 'debug',
            }
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
      documents,
    };
  }
}
