import { Injectable } from '@nestjs/common';
import { Tool } from '../../processor';
import { z } from 'zod';
import { ActionHelperService } from '../../common';
import { WorkflowEntity } from '../../persistence/entities';
import { ContextInterface } from '../../processor/interfaces/context.interface';
import { WorkflowData } from '../../processor/interfaces/workflow-data.interface';
import { ToolApplicationInfo, ToolInterface, ToolResult } from '../../processor/interfaces/tool.interface';
import { DocumentCreateInterface } from '../../persistence/interfaces/document-create.interface';

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
    const documents: DocumentCreateInterface[] = [];
    if (data?.imports) {
      for (const [name, item] of Object.entries(data.imports)) {
        const documentData = {
          name: `debug-${name}`,
          type: 'info',
          contents: JSON.stringify(item, null, 2),
          contentType: 'json',
          meta: {
            hideAtPlaces: ['finished']
          }
        } as DocumentCreateInterface;

        this.actionHelperService.validateDocument(documentData)
        documents.push(this.actionHelperService.createDocument(documentData, info));
      }
    }

    return {
      documents,
    };
  }
}
