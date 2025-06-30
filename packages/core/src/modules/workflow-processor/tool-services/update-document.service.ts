import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentConfigSchema,
  PartialDocumentSchema,
  Service,
  ServiceInterface,
  ServiceCallResult,
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
    id: z.string(),
    update: PartialDocumentSchema.optional(),
  })
  .strict();

@Injectable()
@Service({
  config,
  schema,
})
export class UpdateDocumentService implements ServiceInterface {
  private readonly logger = new Logger(UpdateDocumentService.name);

  constructor(private documentService: DocumentService) {}

  async apply(
    props: z.infer<typeof schema>,
    workflow: WorkflowEntity | undefined,
  ): Promise<ServiceCallResult> {
    if (!workflow) {
      throw new Error('Workflow is undefined');
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
      success: true,
      persist: true,
      workflow,
      data: document,
    };
  }
}
