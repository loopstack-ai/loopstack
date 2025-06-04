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

const config = z
  .object({
    id: ExpressionString,
    update: DocumentConfigSchema.partial().optional(),
  })
  .strict();

const schema = z
  .object({
    id: NonExpressionString,
    update: PartialDocumentSchema.optional(),
  })
  .strict();

@Injectable()
@Tool({
  name: 'updateDocument',
  description: 'Update an existing document',
  config,
  schema,
})
export class UpdateDocumentService implements ToolInterface {
  private readonly logger = new Logger(UpdateDocumentService.name);

  constructor(private documentService: DocumentService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<ToolResult> {
    if (!workflow) {
      return {};
    }

    let document = workflow.documents.find((item) => item.id === props.id);
    if (!document) {
      throw new Error(`Document with ID ${props.id} not found.`);
    }

    this.logger.debug(`Update document "${document.name}".`);

    document = this.documentService.update(
      workflow,
      merge(document, props.update),
    );

    return {
      workflow,
      commitDirect: true,
      data: document,
    };
  }
}
