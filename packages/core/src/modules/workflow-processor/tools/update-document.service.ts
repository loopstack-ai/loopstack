import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentConfigSchema,
  NonExpressionString,
  PartialDocumentSchema,
  Tool,
  ToolInterface,
  ToolResult,
} from '@loopstack/shared';
import { z } from 'zod';
import { WorkflowEntity } from '@loopstack/shared';
import { DocumentService } from '../../persistence';
import { merge } from 'lodash';
import { ExpressionString } from '@loopstack/shared/dist/schemas/expression-type.schema';

@Injectable()
@Tool()
export class UpdateDocumentService implements ToolInterface {
  private readonly logger = new Logger(UpdateDocumentService.name);

  configSchema = z.object({
    id: ExpressionString,
    update: DocumentConfigSchema.partial().optional(),
  });

  schema = z.object({
    id: NonExpressionString,
    update: PartialDocumentSchema.optional(),
  });

  constructor(private documentService: DocumentService) {}

  async apply(
    props: z.infer<typeof this.schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<ToolResult> {
    if (!workflow) {
      return {};
    }

    const validData = this.schema.parse(props);

    let document = workflow.documents.find((item) => item.id === validData.id);
    if (!document) {
      throw new Error(`Document with ID ${validData.id} not found.`);
    }

    this.logger.debug(`Update document "${document.name}".`);

    document = this.documentService.update(
      workflow,
      merge(document, validData.update),
    );

    return {
      workflow,
      commitDirect: true,
      data: document,
    };
  }
}
