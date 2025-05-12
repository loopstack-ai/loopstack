import { Injectable, Logger } from '@nestjs/common';
import {
  ContextInterface,
  PartialDocumentSchema,
  Tool,
  EvalContextInfo,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import { merge } from 'lodash';

@Injectable()
@Tool()
export class UpdateDocumentService implements ToolInterface {
  private readonly logger = new Logger(UpdateDocumentService.name);
  schema = z.object({
    id: z.string(),
    update: PartialDocumentSchema.optional(),
  });

  constructor(
    private documentService: DocumentService,
  ) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<ToolResult> {
    if (!workflow) {
      return {}
    }

    const validProps = this.schema.parse(props);

    let document = workflow.documents.find((item) => item.id === validProps.id);
    if (!document) {
      throw new Error(`Document with ID ${validProps.id} not found.`);
    }

    this.logger.debug(`Update document "${document.name}".`);

    document = this.documentService.update(workflow, merge(document, validProps.update));

    return {
      workflow,
      commitDirect: true,
      data: {
        document
      }
    }
  }
}
